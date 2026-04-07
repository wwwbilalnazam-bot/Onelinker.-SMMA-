// ════════════════════════════════════════════════════════════
// TIKTOK API — BASE CLIENT
//
// Direct TikTok API integration using TikTok Login Kit (OAuth 2.0).
// Complies with TikTok's specific OAuth requirements:
//   - Uses /v2/oauth/token/ (POST with urlencoded body)
//   - PKCE not required but state is mandatory
//   - Tokens: access (~24h), refresh (~365 days)
//   - Content Posting API for publishing
//
// Required env vars:
//   TIKTOK_CLIENT_KEY    — TikTok App Client Key
//   TIKTOK_CLIENT_SECRET — TikTok App Client Secret
// ════════════════════════════════════════════════════════════

export const TIKTOK_AUTH_BASE = "https://www.tiktok.com";
export const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
export const TIKTOK_TOKEN_URL = `${TIKTOK_API_BASE}/oauth/token/`;

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string,
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

// ── Environment helpers ─────────────────────────────────────

export function getTikTokClientKey(): string {
  const key = process.env.TIKTOK_CLIENT_KEY?.trim();
  if (!key) throw new TikTokApiError("TIKTOK_CLIENT_KEY is not configured", 500);
  return key;
}

export function getTikTokClientSecret(): string {
  const secret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!secret) throw new TikTokApiError("TIKTOK_CLIENT_SECRET is not configured", 500);
  return secret;
}

// ── Types ───────────────────────────────────────────────────

interface TikTokErrorBody {
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
}

// ── Core fetch wrapper ──────────────────────────────────────

export async function tiktokGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${TIKTOK_API_BASE}${path}`);

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
    const body = (await res.json().catch(() => ({}))) as TikTokErrorBody;
    throw new TikTokApiError(
      body.error?.message ?? `TikTok API error: ${res.status}`,
      res.status,
      body.error?.code
    );
  }

  return res.json() as Promise<T>;
}

export async function tiktokPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${TIKTOK_API_BASE}${path}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  console.log(`[tiktok/client] POST ${path}`);
  console.log(`[tiktok/client] Request body:`, JSON.stringify(body, null, 2));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let rawText = "";
  try {
    rawText = await res.text();
    console.log(`[tiktok/client] Response status: ${res.status}`);
    console.log(`[tiktok/client] Response body:`, rawText);
  } catch (e) {
    console.error(`[tiktok/client] Error reading response:`, e);
  }

  if (!res.ok) {
    let errBody: TikTokErrorBody = {};
    try {
      errBody = JSON.parse(rawText);
    } catch {
      // If response isn't JSON, create error from status
    }
    throw new TikTokApiError(
      errBody.error?.message ?? `TikTok API error: ${res.status}`,
      res.status,
      errBody.error?.code
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new TikTokApiError(
      `Invalid JSON response from TikTok: ${rawText}`,
      res.status
    );
  }
}

// ── OAuth helpers ───────────────────────────────────────────

export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;          // ~86400 (24 hours)
  open_id: string;             // TikTok user's unique open_id
  refresh_token: string;
  refresh_expires_in: number;  // ~31536000 (365 days)
  scope: string;
  token_type: string;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * TikTok requires POST with application/x-www-form-urlencoded body.
 * TikTok uses "client_key" instead of "client_id".
 * PKCE requires code_verifier to be sent with the token request.
 */
export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<TikTokTokenResponse> {
  const params: Record<string, string> = {
    client_key: getTikTokClientKey(),
    client_secret: getTikTokClientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  };

  // Add code_verifier if PKCE is being used
  if (codeVerifier) {
    params.code_verifier = codeVerifier;
  }

  console.log("[tiktok/client] Token exchange request - redirect_uri:", redirectUri, "has_code_verifier:", !!codeVerifier);

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
      data?: { description?: string };
    };
    console.error("[tiktok/client] Token exchange error response:", JSON.stringify(err));
    throw new TikTokApiError(
      err.error_description ?? err.data?.description ?? err.error ?? `Token exchange failed: ${res.status}`,
      res.status,
      err.error
    );
  }

  const data = await res.json() as any;
  console.log("[tiktok/client] Token exchange response:", JSON.stringify(data).substring(0, 500));

  // TikTok sandbox returns token directly, production wraps in "data" field
  const tokenData = data.data ?? data;
  const tokenResponse = tokenData as TikTokTokenResponse;

  if (!tokenResponse.access_token) {
    console.error("[tiktok/client] Missing access token. Full response:", JSON.stringify(data));
    throw new TikTokApiError("No access token in TikTok response", 400);
  }

  return tokenResponse;
}

/**
 * Refresh an access token using a refresh token.
 * TikTok refresh tokens last ~365 days.
 */
export async function refreshTikTokToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: getTikTokClientKey(),
      client_secret: getTikTokClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    throw new TikTokApiError(
      err.error_description ?? `Token refresh failed: ${res.status}`,
      res.status,
      err.error
    );
  }

  const data = await res.json() as any;

  // TikTok sandbox returns token directly, production wraps in "data" field
  const tokenData = data.data ?? data;
  const tokenResponse = tokenData as TikTokTokenResponse;

  if (!tokenResponse.access_token) {
    throw new TikTokApiError("No access token in refresh response", 400);
  }

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresIn: tokenResponse.expires_in,
  };
}
