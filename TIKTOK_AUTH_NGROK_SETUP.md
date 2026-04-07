# TikTok Authentication Testing with ngrok

## Current Status

✅ **TikTok Auth Implementation**
- OAuth flow properly implemented using TikTok Login Kit v2
- Uses PKCE (Proof Key for Code Exchange) for security
- Callback route exists: `/auth/tiktok/callback`
- Token exchange, refresh, and profile sync implemented
- State parameter includes code_verifier for PKCE

## ngrok Setup for Testing

### Step 1: Start ngrok Tunnel

```bash
ngrok http 3002
```

This will output something like:
```
Forwarding https://xxxx-xx-xxx-xxx-xx.ngrok.io -> http://localhost:3002
```

Copy the HTTPS URL (e.g., `https://xxxx-xx-xxx-xxx-xx.ngrok.io`)

### Step 2: Update Environment Variables

In `.env.local`, temporarily override the app URL:

```env
NEXT_PUBLIC_APP_URL=https://xxxx-xx-xxx-xxx-xx.ngrok.io
```

Replace `xxxx-xx-xxx-xxx-xx` with your actual ngrok subdomain.

### Step 3: Configure TikTok Developer Portal

1. Go to [TikTok Developer Portal](https://developer.tiktok.com/)
2. Find your app in "My Apps"
3. Go to **App Settings** → **Valid redirect URIs**
4. Add the ngrok callback URL:
   ```
   https://xxxx-xx-xxx-xxx-xx.ngrok.io/auth/tiktok/callback
   ```
5. **Save changes**

### Step 4: Start Your Dev Server

```bash
npm run dev
```

The app will start on port 3002.

### Step 5: Run Diagnostic Test

```bash
curl https://xxxx-xx-xxx-xxx-xx.ngrok.io/api/test/tiktok
```

This will verify:
- ✅ Environment variables loaded
- ✅ Database tables accessible
- ✅ OAuth URL generation works
- ✅ PKCE properly configured

### Step 6: Test OAuth Flow

1. Access the app at `https://xxxx-xx-xxx-xxx-xx.ngrok.io`
2. Go to onboarding or account connection
3. Click "TikTok" to connect
4. Authorize the app on TikTok's login page
5. Should redirect back to callback and close popup

## Common Issues & Fixes

### Issue 1: "Redirect URI Mismatch"

**Error:** TikTok rejects with "redirect_uri does not match"

**Cause:** The redirect URI being sent doesn't match what's registered in the developer portal.

**Fix:**
1. Check TikTok Developer Portal has the exact ngrok URL
2. Verify `NEXT_PUBLIC_APP_URL` matches the ngrok URL (including `https://`)
3. Clear browser cache and try again

### Issue 2: "Invalid State Parameter"

**Error:** "Invalid state parameter" on callback

**Cause:** State encoding/decoding mismatch

**Fix:**
1. Check server logs for state decoding errors
2. Ensure `crypto.getRandomValues()` works in your environment
3. Try in a fresh incognito window

### Issue 3: "No Access Token in Response"

**Error:** "No access token in TikTok response"

**Cause:** TikTok returned an error or missing data

**Fix:**
1. Check server logs for full TikTok API response
2. Verify client key and secret are correct
3. Ensure code is being exchanged within 5 minutes of generation

### Issue 4: "Token Expired" After Connection

**Error:** Account shows "token_expired" in database

**Cause:** Access token already expired before first refresh

**Fix:**
1. TikTok access tokens last ~24 hours
2. Auto-refresh is triggered when getting token (5-min buffer)
3. If repeatedly failing, check if refresh token is valid

## Environment Variables Required

```env
# TikTok OAuth Credentials (from Developer Portal)
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret

# App URL (must be HTTPS for production)
NEXT_PUBLIC_APP_URL=https://xxxx-xx-xxx-xxx-xx.ngrok.io
```

## Architecture Overview

```
Client (Browser)
    ↓
[Step 1] connectPlatform() → POST /api/accounts/connect
    ↓
[Step 2] buildTikTokOAuthUrl() → Generate OAuth URL with PKCE
    ↓
[Step 3] Redirect to TikTok login
    ↓
[Step 4] User authorizes → TikTok redirects to callback
    ↓
[Step 5] GET /auth/tiktok/callback?code=...&state=...
    ↓
[Step 6] extractCallbackParams() → Decode state + verify
    ↓
[Step 7] handleTikTokOAuthCode() → Exchange code for tokens
    ↓
[Step 8] tiktokGet(/user/info/) → Fetch user profile
    ↓
[Step 9] syncTikTokProfileToSupabase() → Store tokens + profile
    ↓
[Step 10] popupClose() → Close OAuth popup
```

## Testing Checklist

- [ ] ngrok tunnel running and URL configured
- [ ] `NEXT_PUBLIC_APP_URL` updated in `.env.local`
- [ ] TikTok Developer Portal has ngrok redirect URI
- [ ] Dev server running (`npm run dev`)
- [ ] Diagnostic test passes (`/api/test/tiktok`)
- [ ] OAuth flow initiates (connects successfully)
- [ ] Account appears in database with valid tokens
- [ ] Account is marked `is_active: true` and `health_status: healthy`

## Debug Logging

The following endpoints log detailed information:

- `/lib/tiktok/client.ts` - Token exchange, API calls
- `/lib/tiktok/accounts.ts` - Profile sync, token refresh
- `/app/auth/tiktok/callback/route.ts` - OAuth callback handling

Check server console for `[tiktok/*]` prefixed logs.

## Additional Resources

- [TikTok Login Kit Documentation](https://developers.tiktok.com/doc/login-kit/)
- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api/)
- [ngrok Documentation](https://ngrok.com/docs)
