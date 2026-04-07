# TikTok OAuth Testing with ngrok - Quick Start

## Quick Setup (5 minutes)

### 1. Start ngrok in a terminal
```bash
ngrok http 3002
```
Copy the HTTPS URL (e.g., `https://a1b2-c3d4.ngrok.io`)

### 2. Update `.env.local`
Replace `localhost:3002` with your ngrok URL:
```env
NEXT_PUBLIC_APP_URL=https://a1b2-c3d4.ngrok.io
```

### 3. TikTok Developer Portal Setup
Only needs to be done ONCE per ngrok URL:

1. Go to [TikTok Developer Portal](https://developer.tiktok.com/)
2. Select your app → **App Settings** → **Valid redirect URIs**
3. Add:
   ```
   https://a1b2-c3d4.ngrok.io/auth/tiktok/callback
   ```
4. Save

### 4. Start the dev server
```bash
npm run dev
```

### 5. Test in browser
```
https://a1b2-c3d4.ngrok.io
```

Navigate to account connection and click TikTok.

## What Was Fixed

### Bug: Redirect URI Mismatch
**Problem:** When using ngrok or any custom domain, the OAuth flow would fail because:
- Frontend sent: `https://your-ngrok-url.ngrok.io/auth/tiktok/callback`
- Backend reconstructed: `http://localhost:3000/auth/tiktok/callback` (from NEXT_PUBLIC_APP_URL)
- TikTok rejected with "redirect_uri mismatch"

**Solution:** 
- Now stores the original redirect URI in the OAuth state parameter
- Callback handler retrieves it instead of reconstructing
- Guarantees exact match with initiation request

### Files Changed
1. `lib/tiktok/accounts.ts` - Include redirectUri in state
2. `lib/providers/tiktok-direct.ts` - Use stored redirectUri from state

## Expected Flow

```
1. Frontend calls /api/accounts/connect with:
   - platform: "tiktok"
   - redirect_uri: "https://a1b2-c3d4.ngrok.io/auth/tiktok/callback"

2. Backend generates OAuth URL with state containing:
   - workspaceId
   - codeVerifier (for PKCE)
   - redirectUri ← NEW: Stored for callback

3. User authorizes on TikTok

4. TikTok redirects to:
   https://a1b2-c3d4.ngrok.io/auth/tiktok/callback?code=...&state=...

5. Callback handler:
   - Decodes state
   - Retrieves original redirectUri from state
   - Exchanges code using EXACT same redirectUri
   - TikTok accepts (URIs match!)

6. Account connected ✓
```

## Testing Checklist

- [ ] ngrok URL copied
- [ ] `.env.local` updated with ngrok URL
- [ ] TikTok Developer Portal has redirect URI registered
- [ ] Dev server running (`npm run dev`)
- [ ] Can access app at ngrok URL
- [ ] TikTok connection initiates
- [ ] User can authorize on TikTok
- [ ] Callback completes successfully
- [ ] Account appears in database

## Troubleshooting

### "Connection failed" popup
**Solution:** Check server logs for specific error message

### "redirect_uri does not match"
**Solution:** 
1. Verify ngrok URL in browser matches tunneled URL
2. Check TikTok Developer Portal has exact URL registered
3. Restart dev server

### "Invalid state parameter"
**Solution:** 
1. Clear browser cache
2. Try in incognito window
3. Check server logs for state decode errors

### ngrok disconnects
**Solution:** Just restart: `ngrok http 3002` and update `.env.local` with new URL

## That's It!

The redirect URI mismatch bug is now fixed. Your OAuth flow should work smoothly with ngrok.

For detailed debugging, check: [TIKTOK_AUTH_NGROK_SETUP.md](./TIKTOK_AUTH_NGROK_SETUP.md)
