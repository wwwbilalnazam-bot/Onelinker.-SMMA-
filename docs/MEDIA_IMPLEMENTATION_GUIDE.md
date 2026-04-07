# Media Optimization System - Implementation Guide

Complete integration guide for the enterprise-grade media optimization system in Onelinker.

## 🎯 What's Included

### Core Files Created
```
lib/media/
├── types.ts                      (284 lines) - Types, constants, platform definitions
├── platform-mapping.ts           (172 lines) - Smart platform selection logic
├── image-processor.ts            (288 lines) - Image processing with Sharp
├── video-processor.ts            (360 lines) - Video processing with FFmpeg
└── media-optimizer.ts            (354 lines) - Main orchestration layer

components/media/
├── MediaUploadZone.tsx           (148 lines) - Upload UI with drag-drop
├── MediaOptimizerSettings.tsx     (197 lines) - Toggle & format selection
└── MediaVariantsPreview.tsx       (217 lines) - Preview & platform mapping view

components/examples/
└── MediaOptimizationDemo.tsx      (348 lines) - Full working example

hooks/
└── useMediaOptimization.ts        (188 lines) - React hook for integration

app/api/media/
└── upload/route.ts               (126 lines) - Upload endpoint

supabase/migrations/
└── add_media_optimization.sql     (204 lines) - Database schema

docs/
├── MEDIA_OPTIMIZATION.md          - Feature documentation
└── MEDIA_IMPLEMENTATION_GUIDE.md  - This file
```

**Total: 2,886 lines of production-ready code**

## ⚡ Quick Integration (5 Minutes)

### 1. Install Dependencies
```bash
npm install sharp
# Optional but recommended for video processing
npm install ffmpeg-static
```

### 2. Run Database Migration
```bash
supabase db push
# Or manually run: docs/migrations/add_media_optimization.sql
```

### 3. Add to Your Component
```tsx
import { MediaOptimizationDemo } from "@/components/examples/MediaOptimizationDemo";

export function MyPage() {
  return <MediaOptimizationDemo />;
}
```

## 📋 File-by-File Guide

### 1. Types & Constants (`lib/media/types.ts`)
```typescript
// Platform definitions with requirements
PLATFORM_REQUIREMENTS: Record<SocialPlatform, PlatformRequirements>

// Aspect ratio constants
ASPECT_RATIOS: { square, portrait, vertical, landscape, widescreen }

// Resolution presets
RESOLUTIONS: { "1:1": {1080x1080}, "4:5": {1080x1350}, ... }

// Data structures
MediaFile, MediaVariant, ProcessingJob
```

**When to modify:**
- Adding new platform → add to `PLATFORM_REQUIREMENTS`
- Adding new aspect ratio → add to `ASPECT_RATIOS` and `RESOLUTIONS`

### 2. Platform Mapping (`lib/media/platform-mapping.ts`)
```typescript
// Main functions
getRecommendedAspectRatio(platform)           // Get best format for platform
findBestAspectRatio(platform, available)      // Find closest match
autoSelectAspectRatios(platforms, available)  // Auto-map all platforms
getOptimalVariants(platforms)                 // Minimal variants needed
```

**Use case:** When user selects Instagram + TikTok, automatically choose 1:1 and 9:16 formats.

### 3. Image Processing (`lib/media/image-processor.ts`)
```typescript
// Core functions
detectImageDimensions(buffer)              // Get image size
processImage(buffer, targetRatio, options) // Resize/crop/compress
generateImageVariants(buffer, ratios)      // Generate all formats
generateImageThumbnail(buffer)             // Create thumbnail
```

**Processing pipeline:**
1. Detect dimensions
2. Calculate crop (center-focused)
3. Resize to target
4. Convert to WebP
5. Compress to 80% quality

### 4. Video Processing (`lib/media/video-processor.ts`)
```typescript
// Core functions
detectVideoInfo(filePath)                  // Get video metadata
calculatePaddingDimensions(video, target)  // Padding calculation
processVideo(input, output, ratio)         // Transcode with padding
generateVideoVariants(input, ratios)       // Generate all formats
generateVideoThumbnail(input, output)      // Extract first frame
```

**Processing pipeline:**
1. Detect video properties
2. Calculate padding dimensions
3. Scale video
4. Add black bars (not crop)
5. Encode H.264 CRF 25
6. Extract thumbnail

### 5. Media Optimizer (`lib/media/media-optimizer.ts`)
```typescript
// Main orchestration
createMediaRecord()        // Create metadata record
processMedia()            // Generate variants
uploadMediaToStorage()    // Upload to Supabase
saveMediaMetadata()       // Save to database

// Utilities
detectMediaType()         // Image vs Video
getPlatformVariantMappings()  // Platform → variant map
```

### 6. Upload Endpoint (`app/api/media/upload/route.ts`)
```typescript
// POST /api/media/upload?workspaceId=<id>
// FormData: file, fileName, selectedPlatforms, autoOptimize
// Response: { mediaFile, variants }
```

**Error handling:**
- 401: Not authenticated
- 400: Missing file or workspaceId
- 500: Processing failed

### 7. React Components

**MediaUploadZone**
- Drag-drop upload
- Progress tracking
- Error display

**MediaOptimizerSettings**
- Auto-optimize toggle
- Manual format selection
- Quality settings
- Format preview grid

**MediaVariantsPreview**
- Thumbnail grid for all variants
- Platform-to-variant mapping
- File size summary

**useMediaOptimization Hook**
```typescript
const {
  isLoading,
  error,
  mediaFile,
  variants,
  progress,
  uploadMedia,
  getBestVariant,
  reset
} = useMediaOptimization({ workspaceId });
```

## 🔌 Integration Steps

### Step 1: Add to Compose Page
```tsx
// In components/compose/YourComposeSection.tsx
import { MediaUploadZone } from "@/components/media/MediaUploadZone";
import { useMediaOptimization } from "@/hooks/useMediaOptimization";

export function ComposeSection() {
  const { workspace } = useWorkspace();
  const { uploadMedia, variants } = useMediaOptimization({
    workspaceId: workspace?.id,
  });

  return (
    <div className="space-y-4">
      <MediaUploadZone onUpload={uploadMedia} />
      {/* Use variants... */}
    </div>
  );
}
```

### Step 2: Save Media with Post
```tsx
// When user publishes post
const handlePublish = async () => {
  const selectedVariant = variants.find(v => v.aspectRatio === selectedFormat);
  
  await fetch("/api/posts", {
    method: "POST",
    body: JSON.stringify({
      mediaUrl: selectedVariant?.url,
      mediaId: mediaFile?.id,
      // ... other post data
    })
  });
};
```

### Step 3: Update Post Database
```sql
-- Add to posts table
ALTER TABLE posts ADD COLUMN media_file_id TEXT REFERENCES media_files(id);
ALTER TABLE posts ADD COLUMN media_variant_id TEXT REFERENCES media_variants(id);
```

## 📊 Performance Optimization

### Image Processing Optimization
```typescript
// For large batches, process sequentially
for (const file of files) {
  const buffer = fs.readFileSync(file);
  const variants = await generateImageVariants(buffer, ratios);
  // Process one at a time to avoid memory issues
}
```

### Video Processing Optimization
```typescript
// Use queue system for videos
const queue = [];
for (const file of videoFiles) {
  queue.push({
    input: file,
    status: 'pending'
  });
}

// Process with concurrency limit
while (queue.length > 0) {
  const job = queue.shift();
  if (activeJobs < 2) {
    processVideoAsync(job); // Max 2 concurrent
  }
}
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_media_files_workspace_status 
  ON media_files(workspace_id, status);

CREATE INDEX idx_media_variants_media_file 
  ON media_variants(media_file_id);
```

## 🔐 Security Considerations

### 1. File Validation
```typescript
// Check magic bytes, not just extension
if (isImageFile(buffer)) {
  // Safe to process as image
}
```

### 2. Size Limits
```typescript
// Enforce per-platform limits
if (fileSize > PLATFORM_REQUIREMENTS[platform].maxFileSize) {
  throw new Error("File too large for this platform");
}
```

### 3. Row Level Security
```sql
-- Ensure users can only access their workspace media
CREATE POLICY "user_workspace_media"
  ON media_files FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  ));
```

## 🚀 Deployment Checklist

- [ ] Run database migration
- [ ] Install `sharp` and `ffmpeg-static`
- [ ] Configure FFmpeg path (if using system FFmpeg)
- [ ] Set storage bucket for media uploads
- [ ] Configure max file size in API
- [ ] Add environment variables for video processing
- [ ] Test with sample images and videos
- [ ] Set up monitoring for processing queue
- [ ] Configure backup strategy for generated variants
- [ ] Document platform requirements for users

## 🐛 Troubleshooting

### Issue: "ffmpeg not found"
```bash
# Ensure FFmpeg is installed
which ffmpeg  # macOS/Linux
where ffmpeg  # Windows

# Or use ffmpeg-static npm package
npm install ffmpeg-static
```

### Issue: "Out of memory for large videos"
```typescript
// Process videos with lower quality/preset
const preset = getOptimalPreset(fileSizeMB);
// ultrafast for large files, fast for normal
```

### Issue: "Storage quota exceeded"
```typescript
// Clean up old variants periodically
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const old = await supabase
  .from('media_files')
  .delete()
  .lt('created_at', thirtyDaysAgo.toISOString());
```

## 📈 Future Enhancements

### Priority 1 (Easy wins)
- [ ] Batch download all variants
- [ ] Platform-specific quality presets
- [ ] Processing stats/analytics

### Priority 2 (Medium effort)
- [ ] AI smart crop (face detection)
- [ ] WebP video support
- [ ] Animated GIF support
- [ ] Resume interrupted uploads

### Priority 3 (Advanced)
- [ ] Real-time processing with WebSockets
- [ ] Distributed processing (multiple workers)
- [ ] ML-based optimal frame selection for videos
- [ ] Subtitle burn-in for accessibility

## 📚 Resources

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Social Platform Specs](docs/PLATFORM_SPECIFICATIONS.md)

## 🤝 Contributing

When extending:

1. **Add aspect ratio**: Update `ASPECT_RATIOS`, `RESOLUTIONS`, `PLATFORM_REQUIREMENTS`
2. **Add platform**: Update `PLATFORM_REQUIREMENTS` and mapping logic
3. **Fix processing**: Modify relevant processor (image/video)
4. **Update UI**: Add controls in settings component
5. **Test thoroughly**: Test with real files from each platform

## ✅ Testing Checklist

```typescript
// Test each aspect:
- Image processing: Square, Portrait, Vertical, Landscape
- Video processing: All aspect ratios with different codecs
- Platform mapping: All platform combinations
- Error handling: Invalid files, oversized files
- Edge cases: Animated GIFs, vertical videos, slow uploads
- Performance: Large batches, concurrent processing
```

## 📄 License

Part of Onelinker Social Media Scheduling Platform
