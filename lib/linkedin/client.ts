// ════════════════════════════════════════════════════════════
// LINKEDIN API — BASE CLIENT
//
// Direct LinkedIn API integration using OAuth 2.0.
// Uses the Community Management API for posting.
//
// Required env vars:
//   LINKEDIN_CLIENT_ID     — LinkedIn OAuth App Client ID
//   LINKEDIN_CLIENT_SECRET — LinkedIn OAuth App Client Secret
// ════════════════════════════════════════════════════════════

export const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
export const LINKEDIN_OAUTH_BASE = "https://www.linkedin.com/oauth/v2";
export const LINKEDIN_TOKEN_URL = `${LINKEDIN_OAUTH_BASE}/accessToken`;

export class LinkedInApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly serviceErrorCode?: number,
  ) {
    super(message);
    this.name = "LinkedInApiError";
  }
}

// ── Environment helpers ─────────────────────────────────────

export function getLinkedInClientId(): string {
  const id = process.env.LINKEDIN_CLIENT_ID;
  if (!id) throw new LinkedInApiError("LINKEDIN_CLIENT_ID is not configured", 500);
  return id;
}

export function getLinkedInClientSecret(): string {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!secret) throw new LinkedInApiError("LINKEDIN_CLIENT_SECRET is not configured", 500);
  return secret;
}

// ── Types ───────────────────────────────────────────────────

interface LinkedInErrorBody {
  message?: string;
  serviceErrorCode?: number;
  status?: number;
}

// ── Core fetch wrapper ──────────────────────────────────────

export async function linkedinGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${LINKEDIN_API_BASE}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "LinkedIn-Version": "202401",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), { headers, cache: "no-store" });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as LinkedInErrorBody;
    throw new LinkedInApiError(
      body.message ?? `LinkedIn API error: ${res.status}`,
      res.status,
      body.serviceErrorCode
    );
  }

  return res.json() as Promise<T>;
}

export async function linkedinPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${LINKEDIN_API_BASE}${path}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "LinkedIn-Version": "202401",
    "X-Restli-Protocol-Version": "2.0.0",
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
    const errBody = (await res.json().catch(() => ({}))) as LinkedInErrorBody;
    throw new LinkedInApiError(
      errBody.message ?? `LinkedIn API error: ${res.status}`,
      res.status,
      errBody.serviceErrorCode
    );
  }

  // LinkedIn POST often returns 201 with Location header or empty body
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function linkedinDelete(
  path: string,
  accessToken?: string
): Promise<void> {
  const url = new URL(`${LINKEDIN_API_BASE}${path}`);

  const headers: Record<string, string> = {
    "LinkedIn-Version": "202401",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers,
    cache: "no-store",
  });

  if (!res.ok && res.status !== 404) {
    const errBody = (await res.json().catch(() => ({}))) as LinkedInErrorBody;
    throw new LinkedInApiError(
      errBody.message ?? `LinkedIn API delete failed: ${res.status}`,
      res.status
    );
  }
}

// ── OAuth helpers ───────────────────────────────────────────

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;       // Typically 5184000 (60 days)
  refresh_token?: string;   // Available with r_basicprofile refresh
  refresh_token_expires_in?: number;
  scope: string;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: getLinkedInClientId(),
      client_secret: getLinkedInClientSecret(),
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new LinkedInApiError(
      err.error_description ?? err.error ?? `Token exchange failed: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<LinkedInTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 * Note: LinkedIn refresh tokens require the "r_basicprofile" scope
 * and are only available for certain app types.
 */
export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getLinkedInClientId(),
      client_secret: getLinkedInClientSecret(),
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new LinkedInApiError(
      err.error_description ?? `Token refresh failed: ${res.status}`,
      res.status
    );
  }

  const data = (await res.json()) as LinkedInTokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
