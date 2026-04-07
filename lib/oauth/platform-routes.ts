// ════════════════════════════════════════════════════════════
// PLATFORM CALLBACK ROUTES — Maps platform IDs to their
// OAuth callback path segments.
//
// Used by both frontend (to build redirect_uri) and backend
// (to reconstruct redirect_uri during token exchange).
// ═════════��══════════════════════════════���═══════════════════

const CALLBACK_PATH_MAP: Record<string, string> = {
  facebook: "meta",
  instagram: "meta",
  linkedin: "linkedin",
  youtube: "youtube",
  tiktok: "tiktok",
  twitter: "twitter",
  threads: "threads",
  bluesky: "bluesky",
  pinterest: "pinterest",
  google_business: "google-business",
};

/**
 * Get the callback route path segment for a platform.
 * e.g. "instagram" → "meta", "linkedin" → "linkedin"
 */
export function getCallbackPath(platform: string): string {
  return CALLBACK_PATH_MAP[platform] ?? platform;
}

/**
 * Build the full callback URL for a platform.
 * e.g. getCallbackUrl("instagram") → "https://app.onelinker.ai/auth/meta/callback"
 */
export function getCallbackUrl(platform: string, origin: string): string {
  return `${origin}/auth/${getCallbackPath(platform)}/callback`;
}
