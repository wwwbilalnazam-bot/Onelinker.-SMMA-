# TikTok Video Publishing - Setup & Troubleshooting

## Current Status

✅ **OAuth working** - TikTok account connection successful
❌ **Publishing failing** - TikTok API error: 404

## The Issue: 404 on Content Posting API

The app is trying to use TikTok's **Content Posting API** endpoints:
- `POST /v2/post/publish/inbox/initialize/` - Initialize upload
- `POST /v2/post/publish/action/publish/` - Publish video

But getting **404 Not Found**, which means:

### Root Causes

1. **Sandbox Mode Limitation**
   - Your app is in TikTok Sandbox with `TIKTOK_CLIENT_KEY` starting with "sbaw..."
   - Sandbox has **limited feature access**
   - Content Posting API might not be available in sandbox

2. **API Access Not Enabled**
   - Even in production, Content Posting API needs explicit approval
   - Your app might be missing "video.publish" scope approval at platform level
   - Different from OAuth scope - it's an app-level permission in Developer Portal

3. **Endpoint Differences**
   - Sandbox and production might use different endpoints
   - Or endpoint structure changed

## Solutions

### Option 1: Move to Production (Recommended)

1. **TikTok Developer Portal** → Your app
2. Go to **App Settings** → **Environments**
3. Switch from **Sandbox** to **Production** (if available)
4. Update credentials:
   ```env
   TIKTOK_CLIENT_KEY=your_production_key
   TIKTOK_CLIENT_SECRET=your_production_secret
   ```

### Option 2: Request Content Posting API Access

1. **TikTok Developer Portal** → Your app
2. Go to **Permissions** or **API Access**
3. Look for "Content Posting API" and request access
4. Wait for TikTok to approve (usually 24-48 hours)

### Option 3: Use Alternative Method (Workaround)

If Content Posting API is not available, you can:
- Use TikTok's **Web Video Upload** feature (if available)
- Implement deferred publishing (save draft, user publishes manually)
- Wait for API access approval

## Testing After Changes

```bash
# 1. Update .env.local with new credentials
TIKTOK_CLIENT_KEY=your_new_key
TIKTOK_CLIENT_SECRET=your_new_secret

# 2. Restart dev server
npm run dev -- -p 3002

# 3. Disconnect and reconnect TikTok account
# 4. Try publishing again
```

## Current Implementation

**File:** `lib/tiktok/posts.ts`

### Upload Workflow:
```
1. Initialize upload
   POST /v2/post/publish/inbox/initialize/
   {
     source_info: {
       source: "FILE_UPLOAD",
       file_name: "video.mp4"
     }
   }
   → Returns upload_url, upload_id

2. Upload video
   PUT {upload_url}
   Body: video file bytes

3. Publish
   POST /v2/post/publish/action/publish/
   {
     media_type: "VIDEO",
     upload_id: "...",
     description: "...",
     privacy_level: "PUBLIC_TO_EVERYONE"
   }
   → Returns create_id (post ID)
```

## Debug Steps

### Check Server Logs
The publishing attempts log:
```
[tiktok/posts] Initializing upload...
[tiktok/posts] Uploading video file...
[tiktok/posts] Publishing video...
[tiktok/posts] Error: ...
```

### Test Diagnostics
```bash
curl http://localhost:3002/api/test/tiktok
```

Should show posting module status.

## What to Check in TikTok Developer Portal

1. **App Settings** → Verify Client Key & Secret match .env
2. **Permissions** → Check "video.publish" is enabled
3. **Valid Redirect URIs** → Make sure callback URL is registered
4. **API Access** → Look for Content Posting API status
5. **Environments** → Check if in Sandbox or Production
6. **Rate Limits** → Make sure not hitting API limits

## API Reference

### Content Posting API Endpoints
- **Sandbox:** `https://open.tiktokapis.com/v2/post/publish/...` (might not work)
- **Production:** `https://open.tiktokapis.com/v2/post/publish/...`

### Scopes Required
For publishing:
- `video.publish` - **Required**
- `user.info.basic` - For getting user info

## Common Error Codes

| Error | Meaning | Fix |
|-------|---------|-----|
| 404 | Endpoint not found | API not enabled for app/sandbox |
| 403 | Forbidden | Missing permissions or scope |
| 400 | Bad request | Invalid parameters |
| 429 | Rate limited | Too many requests |
| 500 | Server error | TikTok API issue |

## Next Steps

1. Check your TikTok Developer Portal app settings
2. Verify you have Content Posting API access
3. If in sandbox, request production access
4. Update credentials if needed
5. Test again

**Questions?** Check TikTok's official documentation:
- [Content Posting API](https://developers.tiktok.com/doc/content-posting-api/)
- [Login Kit Scopes](https://developers.tiktok.com/doc/login-kit-web/)
