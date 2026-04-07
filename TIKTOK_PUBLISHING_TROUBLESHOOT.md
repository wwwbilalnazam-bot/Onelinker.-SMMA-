# TikTok Publishing Troubleshooting

## Current Error
```
Please review our integration guidelines at 
https://developers.tiktok.com/doc/content-sharing-guidelines/
```

## What This Means

TikTok's API is working, but your app/account doesn't meet the requirements for direct posting. This happens when:

### 1. ❌ App is in Sandbox Mode
**Symptom:** App uses sandbox credentials
**Solution:** 
- Upgrade app to Production in TikTok Developer Portal
- Get production credentials
- Update `.env.local`

### 2. ❌ App Not Audited by TikTok
**Symptom:** "Unaudited clients" error
**Official Quote:** 
> "All content posted by unaudited clients will be restricted to private viewing mode. Once you have successfully tested your integration, to lift the restrictions on content visibility, your API client must undergo an audit to verify compliance with our Terms of Service."

**Solution:**
- Submit app for audit in Developer Portal
- TikTok reviews (usually 24-48 hours)
- Wait for approval
- Then publishing works

### 3. ❌ Direct Post Feature Not Enabled
**Symptom:** Feature not available in app settings
**Solution:**
1. Go to [TikTok Developer Portal](https://developer.tiktok.com/)
2. Your app → **Products**
3. Look for "Content Posting API"
4. Enable **"Direct Post"** configuration
5. Save changes

### 4. ❌ User Account Not Authorized
**Symptom:** Test account doesn't have video.publish permission
**Solution:**
1. Disconnect TikTok account
2. Try OAuth again
3. Make sure to authorize all requested scopes
4. Reconnect account

### 5. ❌ Missing video.publish Scope Approval
**Symptom:** Scope not granted at platform level
**Solution:**
1. Developer Portal → Your app
2. Permissions → Verify `video.publish` is listed
3. If grayed out, request access
4. Wait for TikTok approval

## Checklist to Fix

- [ ] **Check App Mode**
  - [ ] Is app in Sandbox or Production?
  - [ ] If Sandbox, can you upgrade to Production?

- [ ] **Check Direct Post Feature**
  - [ ] Go to TikTok Developer Portal
  - [ ] Your app → Products
  - [ ] Is "Content Posting API" enabled?
  - [ ] Is "Direct Post" configured?

- [ ] **Check Permissions**
  - [ ] Is `video.publish` scope requested in OAuth?
  - [ ] Does OAuth request show `video.publish` in permissions?
  - [ ] Did user authorize all scopes?

- [ ] **Check Account Authorization**
  - [ ] Disconnect TikTok account
  - [ ] Try OAuth again
  - [ ] Authorize all permissions
  - [ ] Try publishing again

- [ ] **Submit for Audit** (if still failing)
  - [ ] In Developer Portal, look for "Audit" or "Compliance"
  - [ ] Submit app for review
  - [ ] Wait 24-48 hours
  - [ ] TikTok will email results

## Current App Status

Your app credentials:
```env
TIKTOK_CLIENT_KEY=sbaw1y0pzu4hrz13ul
TIKTOK_CLIENT_SECRET=qULPdzpW7HknM8iecEXS6bPXGUqMnjve
```

**Indicator:** Client key starts with `sbaw...` = **SANDBOX MODE**

## What to Do Next

### Option 1: Quick Test (Recommended First)
1. Make sure Direct Post feature is enabled in Developer Portal
2. Disconnect & reconnect TikTok account
3. Try publishing again
4. Check error message

### Option 2: Upgrade to Production
1. In Developer Portal, check if you can switch to Production environment
2. Get production credentials
3. Update `.env.local`:
   ```env
   TIKTOK_CLIENT_KEY=your_prod_key
   TIKTOK_CLIENT_SECRET=your_prod_secret
   ```
4. Reconnect account
5. Try publishing

### Option 3: Submit for Audit
1. If everything is configured correctly
2. Submit app for TikTok audit
3. Wait 24-48 hours
4. TikTok emails approval
5. Try publishing again

## References

- [TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api/)
- [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines/)
- [Authentication & Scopes](https://developers.tiktok.com/doc/login-kit/)
- [Developer Portal](https://developer.tiktok.com/)

## How to Check Developer Portal Settings

1. Go to https://developer.tiktok.com/
2. Click "My Apps" in top right
3. Select your Onelinker app
4. Go to **App Settings**
5. Check these sections:
   - **Environments** - Is it Production or Sandbox?
   - **Valid Redirect URIs** - Is callback URL registered?
   - **Permissions** - Is video.publish listed?
6. Go to **Products**
   - Is "Content Posting API" listed?
   - Can you enable "Direct Post"?

## Still Getting Error?

Share with me:
1. Screenshot of TikTok Developer Portal app settings
2. Screenshot of Products/APIs section
3. Whether app is Sandbox or Production
4. Error message from publishing attempt
5. Server logs from publishing attempt

Then I can provide specific next steps!
