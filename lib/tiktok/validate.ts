/**
 * TikTok OAuth Credential Validation
 *
 * Validates and sanitizes TikTok credentials to prevent:
 * - Whitespace/newline injection (e.g., %0A in client_key)
 * - Missing credentials
 * - Malformed credential strings
 */

export function validateTikTokCredentials(): {
  isValid: boolean;
  clientKey: string;
  clientSecret: string;
  errors: string[];
} {
  const errors: string[] = [];
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim() || "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() || "";

  // Check for presence
  if (!clientKey) errors.push("TIKTOK_CLIENT_KEY is not configured");
  if (!clientSecret) errors.push("TIKTOK_CLIENT_SECRET is not configured");

  // Check for common mistakes
  if (clientKey.includes(" ")) errors.push("TIKTOK_CLIENT_KEY contains spaces");
  if (clientSecret.includes(" ")) errors.push("TIKTOK_CLIENT_SECRET contains spaces");
  if (clientKey.includes("\n")) errors.push("TIKTOK_CLIENT_KEY contains newlines");
  if (clientSecret.includes("\n")) errors.push("TIKTOK_CLIENT_SECRET contains newlines");

  // Verify length (TikTok keys are ~15-30 chars)
  if (clientKey.length < 10) errors.push("TIKTOK_CLIENT_KEY seems too short");
  if (clientSecret.length < 10) errors.push("TIKTOK_CLIENT_SECRET seems too short");

  return {
    isValid: errors.length === 0,
    clientKey,
    clientSecret,
    errors,
  };
}
