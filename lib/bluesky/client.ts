// ════════════════════════════════════════════════════════════
// BLUESKY API — BASE CLIENT
//
// Direct Bluesky API integration using the Bluesky/AT Protocol.
// Bluesky uses a custom OAuth-like flow via the AT Protocol.
//
// Required env vars:
//   BLUESKY_CLIENT_ID     — Bluesky app client ID
//   BLUESKY_CLIENT_SECRET — Bluesky app client secret
// ════════════════════════════════════════════════════════════

export const BLUESKY_OAUTH_BASE = "https://bsky.social";
export const BLUESKY_API_BASE = "https://bsky.social/xrpc";

export class BlueskyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BlueskyApiError";
  }
}

// ── Core fetch wrapper ──────────────────────────────────────

interface BlueskyErrorBody {
  error?: string;
  message?: string;
}

export async function blueskyGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${BLUESKY_API_BASE}${path}`);

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
    const body = (await res.json().catch(() => ({}))) as BlueskyErrorBody;
    throw new BlueskyApiError(
      body.message ?? body.error ?? `Bluesky API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export async function blueskyPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${BLUESKY_API_BASE}${path}`);

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
    const errBody = (await res.json().catch(() => ({}))) as BlueskyErrorBody;
    throw new BlueskyApiError(
      errBody.message ?? `Bluesky API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}
