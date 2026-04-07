// ════════════════════════════════════════════════════════════
// PINTEREST API — BASE CLIENT
//
// Direct Pinterest API integration using OAuth 2.0.
// Pinterest's API v5 supports app-only and user-authenticated flows.
//
// Required env vars:
//   PINTEREST_APP_ID     — Pinterest App ID
//   PINTEREST_APP_SECRET — Pinterest App Secret
// ════════════════════════════════════════════════════════════

export const PINTEREST_OAUTH_BASE = "https://api.pinterest.com/oauth";
export const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
export const PINTEREST_TOKEN_URL = `${PINTEREST_OAUTH_BASE}/token`;

export class PinterestApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PinterestApiError";
  }
}

// ── Environment helpers ─────────────────────────────────────

export function getPinterestAppId(): string {
  const id = process.env.PINTEREST_APP_ID;
  if (!id) throw new PinterestApiError("PINTEREST_APP_ID is not configured", 500);
  return id;
}

export function getPinterestAppSecret(): string {
  const secret = process.env.PINTEREST_APP_SECRET;
  if (!secret) throw new PinterestApiError("PINTEREST_APP_SECRET is not configured", 500);
  return secret;
}

// ── Core fetch wrapper ──────────────────────────────────────

interface PinterestErrorBody {
  code?: number;
  message?: string;
}

export async function pinterestGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${PINTEREST_API_BASE}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), { headers, cache: "no-store" });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as PinterestErrorBody;
    throw new PinterestApiError(
      body.message ?? `Pinterest API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export async function pinterestPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${PINTEREST_API_BASE}${path}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as PinterestErrorBody;
    throw new PinterestApiError(
      errBody.message ?? `Pinterest API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

// ── OAuth helpers ───────────────────────────────────────────

export interface PinterestTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangePinterestCode(
  code: string,
  redirectUri: string
): Promise<PinterestTokenResponse> {
  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new PinterestApiError(
      err.error_description ?? err.error ?? `Token exchange failed: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<PinterestTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshPinterestToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new PinterestApiError(
      err.error_description ?? `Token refresh failed: ${res.status}`,
      res.status
    );
  }

  const data = await res.json() as PinterestTokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
