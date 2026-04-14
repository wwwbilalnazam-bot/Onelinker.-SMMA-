// ════════════════════════════════════════════════════════════
// YOUTUBE / GOOGLE API — BASE CLIENT
//
// Direct YouTube Data API v3 integration.
// Uses your own Google Cloud OAuth credentials.
//
// Required env vars:
//   YOUTUBE_CLIENT_ID     — Google OAuth Client ID
//   YOUTUBE_CLIENT_SECRET — Google OAuth Client Secret
// ════════════════════════════════════════════════════════════

export const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
export const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

// ── Environment helpers ─────────────────────────────────────

export function getYouTubeClientId(): string {
  const id = process.env.YOUTUBE_CLIENT_ID;
  if (!id) throw new YouTubeApiError("YOUTUBE_CLIENT_ID is not configured", 500);
  return id.trim();
}

export function getYouTubeClientSecret(): string {
  const secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!secret) throw new YouTubeApiError("YOUTUBE_CLIENT_SECRET is not configured", 500);
  return secret.trim();
}

// ── Types ───────────────────────────────────────────────────

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

// ── Core fetch wrapper ──────────────────────────────────────

export async function youtubeGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}${path}`);

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
    const body = (await res.json().catch(() => ({}))) as GoogleErrorBody;
    const err = body.error;
    throw new YouTubeApiError(
      err?.message ?? `YouTube API error: ${res.status}`,
      res.status,
      String(err?.code ?? ""),
      err?.errors?.[0]?.reason
    );
  }

  return res.json() as Promise<T>;
}

export async function youtubePost<T>(
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

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
    const errBody = (await res.json().catch(() => ({}))) as GoogleErrorBody;
    const err = errBody.error;
    throw new YouTubeApiError(
      err?.message ?? `YouTube API error: ${res.status}`,
      res.status,
      String(err?.code ?? ""),
      err?.errors?.[0]?.reason
    );
  }

  return res.json() as Promise<T>;
}

export async function youtubeDelete(
  path: string,
  params?: Record<string, string>,
  accessToken?: string
): Promise<void> {
  const url = new URL(`${YOUTUBE_API_BASE}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as GoogleErrorBody;
    throw new YouTubeApiError(
      errBody.error?.message ?? `YouTube API delete failed: ${res.status}`,
      res.status
    );
  }
}

// ── OAuth helpers ───────────────────────────────────────────

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string; // Only on first auth, not on refresh
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getYouTubeClientId(),
      client_secret: getYouTubeClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
    throw new YouTubeApiError(
      err.error_description ?? err.error ?? `Token exchange failed: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getYouTubeClientId(),
      client_secret: getYouTubeClientSecret(),
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
    throw new YouTubeApiError(
      err.error_description ?? `Token refresh failed: ${res.status}`,
      res.status
    );
  }

  const data = (await res.json()) as GoogleTokenResponse;
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
