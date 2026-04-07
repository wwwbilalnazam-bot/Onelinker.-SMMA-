# TikTok Integration Testing Guide

## ✅ Setup Complete

Your TikTok sandbox integration is now ready with:
- ✅ OAuth credentials configured in `.env.local`
- ✅ Video posting implementation enabled
- ✅ Account management (OAuth flow + sync)

## 🧪 Test Flow

### 1. **OAuth Connection** 
Test the TikTok login/authorization flow:

**UI Path:** Settings → Connected Accounts → TikTok → "Connect Account"

This will:
1. Redirect to TikTok sandbox auth
2. Ask you to authorize scopes: `user.info.basic`, `user.info.profile`, `video.publish`, `video.list`
3. Return with your TikTok profile synced

**Expected Result:**
- Your TikTok account appears in "Connected Accounts"
- Profile picture, username, and follower count display
- Account marked as "healthy" and "active"

---

### 2. **Create a Post with Video**
Test the full publishing workflow:

**UI Path:** Compose → Select Platform: TikTok → Upload Video → Post

**Requirements:**
- Connected TikTok account
- MP4 video file (recommended: 1080x1920 or 720x1280, <60MB)

**Under the hood:**
1. Video uploaded to your storage (Supabase)
2. TikTok API: Initialize upload → get `upload_url` + `upload_id`
3. TikTok API: Upload video file to `upload_url` (PUT)
4. TikTok API: Publish with `upload_id`
5. Post metadata stored in database

**Expected Result:**
- Post appears in TikTok Creator Studio (sandbox)
- Status shows "published"
- Post ID stored in database

---

### 3. **Sandbox Limitations** 🔒
Your sandbox mode has these restrictions:
- Videos may not appear in your public feed immediately
- Analytics data may be limited
- Publishing rate limits lower than production
- Videos visible in Creator Studio but not always in feed

**To move to production:**
1. TikTok will review your app
2. Request "Release to Production" in TikTok Developer Portal
3. Update `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` with production credentials
4. No code changes needed

---

## 🔧 API Endpoints

### OAuth Start
```bash
POST /api/auth/start
Content-Type: application/json

{
  "platform": "tiktok",
  "workspaceId": "your-workspace-id"
}
```

Response:
```json
{
  "oauthUrl": "https://www.tiktok.com/v2/auth/authorize/?client_key=..."
}
```

### Create Post
```bash
POST /api/posts
Content-Type: application/json

{
  "content": "Check out this video! 🎥",
  "platforms": ["tiktok"],
  "accountIds": ["tt_your-account-id"],
  "mediaUrls": ["https://your-storage.com/video.mp4"]
}
```

Response:
```json
{
  "postId": "post_123",
  "platform": "tiktok",
  "status": "published"
}
```

---

## 🐛 Troubleshooting

### "TikTok access token expired"
**Cause:** Token refresh failed  
**Solution:** Reconnect your TikTok account

### "Video upload failed: 413"
**Cause:** Video file too large  
**Solution:** Use videos under 60MB

### "No access token received from TikTok"
**Cause:** Credentials invalid or API limit exceeded  
**Solution:** 
- Verify `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` in `.env.local`
- Check TikTok Developer Portal for API usage

### "Failed to save TikTok profile to database"
**Cause:** Database schema missing or Supabase connection issue  
**Solution:** Check that `social_accounts` and `tiktok_tokens` tables exist

---

## 📋 Files Modified

- ✅ `.env.local` — Added TikTok credentials
- ✅ `lib/tiktok/posts.ts` — NEW: Video upload & publishing
- ✅ `lib/providers/tiktok-direct.ts` — Implemented createPost()

---

## 🎯 Next Steps

1. **Connect your TikTok sandbox account**
2. **Upload a test video** (10-30 seconds recommended)
3. **Check Creator Studio** to verify it published
4. **Check database** to confirm post metadata stored
5. **Test token refresh** by waiting 24+ hours for access token to expire

---

## 📞 Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Check server logs: `npm run dev` output
3. Verify environment variables are loaded: `console.log(process.env.TIKTOK_CLIENT_KEY)`
4. Check Supabase database for token storage
