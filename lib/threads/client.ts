// ════════════════════════════════════════════════════════════
// THREADS API — BASE CLIENT
//
// Direct Threads API integration using Meta's Graph API.
// Threads is owned by Meta, so it uses the Facebook Graph API
// with Threads-specific endpoints.
//
// Required env vars:
//   THREADS_ACCESS_TOKEN — Threads API access token
//   (or use META_APP_ID + META_APP_SECRET for OAuth)
// ════════════════════════════════════════════════════════════

const GRAPH_API_VERSION = "v21.0";
export const THREADS_API_BASE = `https://graph.threads.net/${GRAPH_API_VERSION}`;

export class ThreadsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ThreadsApiError";
  }
}

// ── Core fetch wrapper ──────────────────────────────────────

interface ThreadsErrorBody {
  error?: {
    message?: string;
    code?: number;
    type?: string;
  };
}

export async function threadsGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${THREADS_API_BASE}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  if (accessToken) {
    url.searchParams.set("access_token", accessToken);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ThreadsErrorBody;
    throw new ThreadsApiError(
      body.error?.message ?? `Threads API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

export async function threadsPost<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const url = new URL(`${THREADS_API_BASE}${path}`);

  if (accessToken) {
    url.searchParams.set("access_token", accessToken);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as ThreadsErrorBody;
    throw new ThreadsApiError(
      errBody.error?.message ?? `Threads API error: ${res.status}`,
      res.status
    );
  }

  return res.json() as Promise<T>;
}
