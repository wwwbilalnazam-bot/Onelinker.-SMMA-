# Supabase Storage Setup Guide

## Avatar Storage Bucket Configuration

**✅ No additional setup required!** Avatar uploads use the existing `workspace-logos` bucket which is already configured as public in your Supabase project.

Files are stored in: `workspace-logos/avatars/{userId}-{timestamp}.{ext}`

### Quick Setup

Follow these steps to set up the storage bucket:

#### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **Create a new bucket** (or **+** button)
4. Set bucket name to: `avatars`
5. Choose **Public** access (so images are publicly visible)
6. Click **Create bucket**

#### Option 2: Via SQL Script (Advanced)

If you prefer SQL, run this in your Supabase SQL Editor:

```sql
-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own avatar folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Verify Setup

Once created, test the upload by:

1. Going to Settings → Profile tab
2. Selecting a profile picture (PNG, JPG, or WebP)
3. Click "Save" button
4. Should see "Profile picture updated" toast notification

### Troubleshooting

**Error: "Failed to upload file"**
- Check that the `avatars` bucket exists in Storage
- Ensure bucket is set to **Public** access
- Check browser console for detailed error messages

**Error: "Invalid bucket name" or "Bucket not found"**
- The bucket name must be exactly: `avatars`
- Verify spelling and case sensitivity
- Refresh the page and try again

**Images are uploaded but show as broken**
- The bucket must be **Public** to serve images
- Go to Storage → Buckets → avatars → Settings
- Verify "Public bucket" is toggled ON

### File Limits

The upload endpoint enforces:
- **File types**: PNG, JPG, WebP
- **Max size**: 5 MB
- **Storage path**: `avatars/{userId}-{timestamp}.{ext}`

### Alternative: Use Workspace Logos Bucket

If you want to reuse the existing `workspace-logos` bucket instead, the code can be modified:

Change the bucket name in `app/api/profile/upload-avatar/route.ts`:
```typescript
// From:
.from("avatars")
// To:
.from("workspace-logos")
```

And update the path if desired. However, keeping separate buckets is cleaner for organization.
