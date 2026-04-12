# Unified Inbox Setup Guide
**Step-by-step instructions to get the unified inbox running**

---

## ✅ Phase 1: Database Setup (5 minutes)

### Step 1.1: Run Supabase Migration

1. Open your [Supabase Dashboard](https://supabase.com)
2. Go to your project → **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260408_unified_inbox_schema.sql`
5. Paste into the SQL Editor
6. Click **Run**
7. Wait for "Success" message

### Step 1.2: Enable Realtime

1. Go to **Database** → **Replication**
2. Find these tables and toggle them ON:
   - `messages`
   - `sync_logs`
3. Wait for status to show "Active"

### Step 1.3: Verify Migration

Run this query in SQL Editor to verify tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('messages', 'sync_logs', 'inbox_messages');
```

Should return 3 rows.

---

## ✅ Phase 2: Environment Variables (3 minutes)

### Step 2.1: Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output (it's your encryption key).

### Step 2.2: Create .env.local

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all values:
   ```env
   # From Supabase Dashboard > API
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx

   # From step 2.1
   TOKEN_ENCRYPTION_KEY=<paste-your-key-here>

   # Leave others blank for now (optional)
   NEXT_PUBLIC_FACEBOOK_APP_ID=
   FACEBOOK_APP_SECRET=
   ...
   ```

### Step 2.3: Verify Setup

```bash
npm run dev
```

You should see:
```
> dev
> next dev
- ready started server on http://localhost:3000
```

✅ If no errors about "TOKEN_ENCRYPTION_KEY", you're good!

---

## ✅ Phase 3: Test API Endpoints (5 minutes)

### Step 3.1: Test Sync Endpoint

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/inbox/sync \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "YOUR_WORKSPACE_ID"}'
```

**Expected response:**
```json
{
  "data": {
    "synced": 0,
    "skipped": 0,
    "errors": 0,
    "results": []
  },
  "error": null
}
```

✅ If you get this (even with 0 synced), the API is working!

### Step 3.2: Test Messages Endpoint

```bash
curl "http://localhost:3000/api/inbox/messages?workspace_id=YOUR_WORKSPACE_ID"
```

**Expected response:**
```json
{
  "data": [],
  "total": 0,
  "limit": 20,
  "offset": 0,
  "has_more": false
}
```

✅ If you get this, both endpoints are working!

---

## ✅ Phase 4: Test UI (3 minutes)

### Step 4.1: Load Inbox Page

1. Open http://localhost:3000/dashboard/inbox in browser
2. You should see:
   - "Inbox" heading
   - "Sync Now" button
   - Empty state message ("No messages yet")
   - Filter bar

### Step 4.2: Test Sync Button

1. Click **"Sync Now"** button
2. Watch for loading state (button shows "Syncing...")
3. You should see a toast notification (top right):
   - "No new messages" (if no accounts connected)
   - Or error about missing tokens (expected at this stage)

✅ If the button responds, UI is working!

---

## ⚠️ Next Steps: Connect Social Accounts

To actually sync messages, you need to:

1. **Connect Facebook/Instagram accounts:**
   - Go to `/dashboard/accounts`
   - Click "Connect Facebook"
   - Authorize OAuth flow
   - Tokens will be encrypted automatically

2. **Verify tokens are stored:**
   ```sql
   SELECT outstand_account_id, encrypted_access_token
   FROM social_accounts
   WHERE workspace_id = 'YOUR_WORKSPACE_ID'
   LIMIT 1;
   ```

3. **Trigger sync again:**
   - Click "Sync Now" button
   - Should fetch comments from recent posts

---

## 🐛 Troubleshooting

### "TOKEN_ENCRYPTION_KEY not set"
**Solution:** Generate a key and add it to `.env.local`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Then add to .env.local
```

### "Not a workspace member" (401/403 error)
**Solution:** Make sure you're logged in and in the correct workspace

### "No new messages" when sync completes
**Solution:** Connect a social account first, then sync will have something to fetch from

### Realtime not working
**Solution:** Verify Realtime is enabled:
- Supabase Dashboard > Database > Replication
- Check that `messages` and `sync_logs` are toggled ON

### TypeScript errors
**Solution:** Run type check:
```bash
npx tsc --noEmit
```

If there are missing types, verify all imports are correct in:
- `lib/channels/types.ts`
- `lib/services/SyncOrchestrator.ts`
- `lib/services/TokenVault.ts`

---

## ✨ Success Checklist

After setup, you should have:

- [ ] Supabase migration ran without errors
- [ ] Realtime enabled for 2 tables
- [ ] `.env.local` created with TOKEN_ENCRYPTION_KEY
- [ ] Dev server running (`npm run dev`)
- [ ] `/api/inbox/sync` endpoint responds
- [ ] `/api/inbox/messages` endpoint responds
- [ ] Inbox page loads without errors
- [ ] "Sync Now" button works
- [ ] No TypeScript errors

If all are checked ✅, you're ready to connect social accounts!

---

## 📚 Next: Connect a Social Account

1. Go to `/dashboard/accounts`
2. Click "Connect Facebook" or "Connect Instagram"
3. Complete OAuth flow
4. Return to Inbox and click "Sync Now"
5. Messages should appear!

---

## 💬 Need Help?

Check these files for guidance:
- `IMPLEMENTATION_GUIDE.md` — Detailed explanations
- `GETTING_STARTED.md` — Quick start reference
- `ARCHITECTURE_SUMMARY.md` — System overview

---

**Status:** Setup phase complete ✅  
**Next Step:** Connect a social account in `/dashboard/accounts`
