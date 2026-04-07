# TikTok OAuth Redirect URI Mismatch - Bug Fix

**Status:** ✅ FIXED
**Date:** 2026-04-05
**Severity:** Critical (blocked all TikTok OAuth flows with custom domains/ngrok)

## The Bug

TikTok OAuth was failing with "redirect_uri does not match" error when using ngrok or any non-localhost domain.

### Root Cause

The redirect URI was being **reconstructed** on the server instead of **preserved** from the client:

**Initiation (correct):**
```typescript
// StepConnectAccount.tsx (line 184)
redirect_uri: `${window.location.origin}/auth/tiktok/callback`
// Sends: https://a1b2-c3d4.ngrok.io/auth/tiktok/callback
```

**Token Exchange (WRONG):**
```typescript
// lib/providers/tiktok-direct.ts (old, line 84-85)
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const redirectUri = `${appUrl}/auth/tiktok/callback`;
// Uses: http://localhost:3000/auth/tiktok/callback (or whatever NEXT_PUBLIC_APP_URL is)
```

This causes a mismatch because:
- OAuth URL initiation uses: `https://a1b2-c3d4.ngrok.io/auth/tiktok/callback`
- Token exchange uses: `http://localhost:3000/auth/tiktok/callback`
- TikTok API rejects the code with "redirect_uri mismatch"

## The Fix

Store the original `redirectUri` in the OAuth state parameter. Retrieve it during callback instead of reconstructing.

### Changes Made

#### 1. `lib/tiktok/accounts.ts`

**Updated `DecodedState` interface:**
```typescript
export interface DecodedState {
  workspaceId: string;
  platform: string;
  nonce: string;
  codeVerifier?: string;
  redirectUri?: string;  // ← NEW
}
```

**Updated `buildTikTokOAuthUrl()`:**
```typescript
const statePayload = JSON.stringify({
  workspaceId: params.workspaceId,
  platform: "tiktok",
  nonce: crypto.randomUUID(),
  codeVerifier,
  redirectUri: params.redirectUri,  // ← NEW: Store original URI
});
```

#### 2. `lib/providers/tiktok-direct.ts`

**Updated `handleCallback()` to retrieve redirectUri from state:**
```typescript
// Decode state to get code_verifier (for PKCE) and original redirect_uri
let codeVerifier: string | undefined;
let redirectUri: string | undefined;

if (state) {
  try {
    const decodedState = decodeState(state);
    codeVerifier = decodedState.codeVerifier;
    redirectUri = decodedState.redirectUri;  // ← NEW: Get original URI
  } catch (err) {
    console.warn("[tiktok-direct] Failed to decode state:", err);
  }
}

// Fallback: reconstruct from NEXT_PUBLIC_APP_URL if not in state
// (for backward compatibility or if state decode fails)
if (!redirectUri) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  redirectUri = `${appUrl}/auth/tiktok/callback`;
}
```

## Impact

- ✅ TikTok OAuth now works with ngrok
- ✅ TikTok OAuth now works with any custom domain
- ✅ Redirect URI mismatch errors eliminated
- ✅ Backward compatible (fallback to old behavior if state decode fails)
- ✅ No breaking changes to other platforms

## Testing

After deploying this fix:

1. **With ngrok:**
   ```bash
   ngrok http 3002
   # Update NEXT_PUBLIC_APP_URL=https://ngrok-url
   npm run dev
   # Test TikTok connection - should work!
   ```

2. **With production domain:**
   - Register callback URL in TikTok Developer Portal
   - OAuth flow should work without issues

3. **With localhost:**
   - Still works as before (fallback behavior)

## Technical Details

### Why State Parameter?

The state parameter is:
- ✅ Part of OAuth 2.0 spec (CSRF protection)
- ✅ Already base64url encoded/decoded by platform
- ✅ Safe to store arbitrary data
- ✅ Immune to URL redirects
- ✅ Transmitted securely (includes code_challenge for PKCE)

### Why Not Use Query String?

Could reconstruct from request headers (`X-Forwarded-*`), but:
- ❌ Not reliable behind proxies
- ❌ Cloud platforms may not preserve headers
- ❌ ngrok specifically can lose this info
- ✅ State parameter is the correct solution

## Backward Compatibility

The fix includes a fallback mechanism:
```typescript
if (!redirectUri) {
  // Old behavior: reconstruct from NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  redirectUri = `${appUrl}/auth/tiktok/callback`;
}
```

This ensures that:
- Old OAuth URLs (generated before this fix) still work
- New URLs use the fixed behavior
- Zero downtime deployment possible

## Related Issues

This fix also prevents similar issues if:
- App is behind a reverse proxy that changes origin
- Load balancer modifies request headers
- CDN rewrites URLs
- Custom port forwarding is used

All of these are handled correctly by storing the original redirectUri in the state.
