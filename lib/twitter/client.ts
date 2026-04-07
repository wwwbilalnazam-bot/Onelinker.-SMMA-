// ════════════════════════════════════════════════════════════
// TWITTER API v2 — BASE CLIENT
//
// Direct Twitter API v2 integration using OAuth 2.0 with PKCE.
// Supports both read and write operations (posting, media upload).
//
// Required env vars:
//   TWITTER_CLIENT_ID     — Twitter API App Client ID
//   TWITTER_CLIENT_SECRET — Twitter API App Client Secret
// ════════════════════════════════════════════════════════════

export const TWITTER_OAUTH_BASE = "https://twitter.com/i/oauth2";
export const TWITTER_API_BASE = "https://api.twitter.com/2";
export const TWITTER_TOKEN_URL = `${TWITTER_OAUTH_BASE}/token`;

export class TwitterApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string,
  ) {
    super(message);
    this.name = "TwitterApiError";
  }
}

// ── Environment helpers ─────────────────────────────────────

export function getTwitterClientId(): string {
  const id = process.env.TWITTER_CLIENT_ID;
  if (!id) throw new TwitterApiError("TWITTER_CLIENT_ID is not configured", 500);
  return id;
}

export function getTwitterClientSecret(): string {
  const secret = process.env.TWITTER_CLIENT_SECRET;
  if (!secret) throw new TwitterApiError("TWITTER_CLIENT_SECRET is not configured", 500);
  return secret;
}

// ── Types ───────────────────────────────────────────────────

interface TwitterErrorBody {
  title?: string;
  detail?: string;
  type?: string;
  status?: number;
  errors?: Array<{ message?: string; code?: number }>;
}

// ── Core fetch wrapper ──────────────────────────────────────

export async function twitterGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${TWITTER_API_BASE}${path}`);

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
    const body = (await res.json().catch(() => ({}))) as TwitterErrorBody;
    throw new TwitterApiError(
      body.detail ?? body.title ?? `Twitter API error: ${res.status}`,
      res.status,
      body.errors?.[0]?.message
    );
  }

  return res.json() as Promise<T>;
}

export async function twitterPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${TWITTER_API_BASE}${path}`);

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
    const errBody = (await res.json().catch(() => ({}))) as TwitterErrorBody;
    throw new TwitterApiError(
      errBody.detail ?? `Twitter API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

// ── OAuth helpers ───────────────────────────────────────────

export interface TwitterTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
  token_type: string;
}

/**
 * Exchange an authorization code for an access token.
 * Twitter v2 requires PKCE for native apps and confidential clients.
 */
export async function exchangeTwitterCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<TwitterTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getTwitterClientId(),
    client_secret: getTwitterClientSecret(),
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new TwitterApiError(
      err.error_description ?? err.error ?? `Token exchange failed: ${res.status}`,
      res.status,
      err.error
    );
  }

  return res.json() as Promise<TwitterTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 * Twitter refresh tokens are long-lived.
 */
export async function refreshTwitterToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getTwitterClientId(),
      client_secret: getTwitterClientSecret(),
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new TwitterApiError(
      err.error_description ?? `Token refresh failed: ${res.status}`,
      res.status,
      err.error
    );
  }

  const data = await res.json() as TwitterTokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
