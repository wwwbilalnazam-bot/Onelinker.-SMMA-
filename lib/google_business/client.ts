// ════════════════════════════════════════════════════════════
// GOOGLE BUSINESS PROFILE API — BASE CLIENT
//
// Direct Google Business Profile API integration.
// Uses the same Google OAuth 2.0 as YouTube but targets
// the Business Profile API endpoints.
//
// Required env vars:
//   GOOGLE_CLIENT_ID     — Google OAuth Client ID
//   GOOGLE_CLIENT_SECRET — Google OAuth Client Secret
// ════════════════════════════════════════════════════════════

export const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_API_BASE = "https://www.googleapis.com";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleBusinessApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleBusinessApiError";
  }
}

// ── Core fetch wrapper ──────────────────────────────────────

interface GoogleErrorBody {
  error?: string;
  error_description?: string;
}

export async function googleBusinessGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${GOOGLE_API_BASE}${path}`);

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
    throw new GoogleBusinessApiError(
      body.error_description ?? body.error ?? `Google API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export async function googleBusinessPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${GOOGLE_API_BASE}${path}`);

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
    throw new GoogleBusinessApiError(
      errBody.error_description ?? `Google API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}
