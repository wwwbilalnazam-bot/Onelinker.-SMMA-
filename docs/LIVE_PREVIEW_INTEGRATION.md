# Live Media Preview Integration Guide

## Overview

The **Live Media Preview** component displays actual uploaded media with real dimensions across all selected platform previews, showing exactly how the media will appear on each platform.

## Features

✅ **Real Media Display** - Shows actual image/video uploaded
✅ **Actual Dimensions** - Displays original media size
✅ **Platform-Specific Preview** - Shows how it will appear on each platform
✅ **Smart Cropping/Padding** - Visual indication of what happens to media
✅ **Responsive Design** - Works on mobile and desktop
✅ **Color-Coded Platforms** - Easy platform identification

## Components

### LiveMediaPreview
Main component that displays all platform previews with actual media.

```tsx
<LiveMediaPreview
  mediaUrl={uploadedFileUrl}
  mediaType="image"
  originalDimensions={{ width: 1920, height: 1080 }}
  selectedPlatforms={["instagram", "tiktok", "youtube-standard"]}
  platformMappings={{
    instagram: "1:1",
    tiktok: "9:16",
    "youtube-standard": "16:9",
  }}
/>
```

## Integration Steps

### 1. Import Component
```tsx
import { LiveMediaPreview } from "@/components/compose/LiveMediaPreview";
```

### 2. Add to Compose Page
In your compose component where you display the preview:

```tsx
export function ComposeSection() {
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    "instagram",
    "facebook",
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left side: Editor */}
      <div className="lg:col-span-3">
        {/* Content editor */}
      </div>

      {/* Right side: Live Preview */}
      <div className="lg:col-span-2">
        <LiveMediaPreview
          mediaUrl={mediaFile?.url}
          mediaType={mediaFile?.type || "image"}
          originalDimensions={mediaFile?.dimensions}
          selectedPlatforms={selectedPlatforms}
          platformMappings={createPlatformMapping(
            selectedPlatforms,
            mediaFile?.variantRatios || ["1:1", "4:5", "9:16", "16:9"]
          )}
        />
      </div>
    </div>
  );
}
```

### 3. Connect with Media Upload

```tsx
import { useMediaOptimization } from "@/hooks/useMediaOptimization";

export function ComposeSection() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const { uploadMedia, variants, mediaFile } = useMediaOptimization({
    workspaceId: workspace?.id,
  });

  const handleMediaUpload = async (file: File) => {
    const data = await uploadMedia(file, selectedPlatforms);
    // mediaFile is automatically updated
  };

  const platformMappings = mediaFile
    ? createPlatformMapping(
        selectedPlatforms,
        mediaFile.variants.map((v) => v.aspectRatio)
      )
    : {};

  return (
    <div className="space-y-6">
      <MediaUploadZone onUpload={handleMediaUpload} />

      <LiveMediaPreview
        mediaUrl={mediaFile?.originalUrl}
        mediaType={mediaFile?.mediaType || "image"}
        originalDimensions={mediaFile?.originalResolution}
        selectedPlatforms={selectedPlatforms}
        platformMappings={platformMappings}
      />
    </div>
  );
}
```

## What Users Will See

### Before Upload
```
Empty state: "Upload media to see live preview"
```

### After Upload
```
📐 Media Dimensions
┌─────────────────────────────────┐
│ Original Size: 1920×1080px      │
│ Aspect Ratio: 1.78:1             │
└─────────────────────────────────┘

Platform Previews (3)
┌─────────────────────┐  ┌─────────────────────┐
│ Instagram Feed      │  │ TikTok              │
│ 1080×1080           │  │ 1080×1920           │
│ [Image Preview]     │  │ [Image Padded]      │
│ Perfect fit         │  │ Padded top/bottom   │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐
│ YouTube Standard    │
│ 1280×720            │
│ [Image Cropped]     │
│ Cropped sides       │
└─────────────────────┘

💡 Tips
• Perfect fit: Media matches platform aspect ratio
• Cropped: Edges removed to fit platform
• Padded: Black bars added to fill space
```

## Display Logic

### Three Scenarios

#### 1. Perfect Fit (Same Aspect Ratio)
```
Original: 1920×1080 (16:9)
Platform: 1280×720 (16:9)
Result: ✅ Scales proportionally, no cropping
Message: "Perfect fit - no cropping or padding"
```

#### 2. Cropped (Image Wider)
```
Original: 1920×1080 (16:9)
Platform: 1080×1920 (9:16)
Result: ⚠️ Image cropped from sides
Message: "Cropped 420px from left, 420px from right"
```

#### 3. Padded (Image Taller)
```
Original: 1080×1920 (9:16)
Platform: 1280×720 (16:9)
Result: ℹ️ Black bars added top/bottom
Message: "Padded 280px top, 280px bottom"
```

## Styling & Customization

### Change Platform Colors
Edit `PLATFORM_CONFIGS` in `LiveMediaPreview.tsx`:

```tsx
const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformPreviewConfig> = {
  instagram: {
    color: "text-pink-600",      // Change text color
    bgColor: "bg-pink-500/10",   // Change background
    // ...
  },
};
```

### Adjust Preview Scale
```tsx
const previewScale = 0.25;  // Change from 0.25 to 0.15 for smaller previews
```

### Customize Messages
Modify the `calculateMediaDisplay()` function to change feedback messages.

## Mobile Responsiveness

The component uses:
- **Mobile**: Shows one detailed preview at a time with swipeable tabs
- **Desktop**: Shows all platform previews in a grid (2 columns)

No additional configuration needed - it's responsive by default!

## Performance

- **Lazy loading**: Uses Next.js Image component
- **Efficient calculations**: Uses memoized dimension calculations
- **No re-renders**: Platform data is static
- **Lightweight**: ~10KB minified

## Edge Cases Handled

✅ Video media (shows play icon instead of actual video)
✅ Multiple aspect ratios
✅ Very wide images (heavily cropped)
✅ Very tall images (heavily padded)
✅ Square images (various transformations)
✅ No media uploaded (empty state)
✅ No platforms selected (empty state)

## Tips for Users

The component includes helpful tips section that explains:

1. **Perfect Fit** - When media matches platform aspect ratio
2. **Cropped** - When edges need to be removed
3. **Padded** - When black bars are added

This helps users understand what's happening to their media on each platform.

## Integration with Existing Preview

If you already have a preview section, simply replace it:

```tsx
// Before
<div className="preview-placeholder">
  <p>Preview will appear here</p>
</div>

// After
<LiveMediaPreview
  mediaUrl={mediaFile?.url}
  mediaType={mediaFile?.type}
  originalDimensions={mediaFile?.dimensions}
  selectedPlatforms={selectedPlatforms}
  platformMappings={mappings}
/>
```

## Complete Example

See `components/examples/MediaOptimizationDemo.tsx` for a complete working example with:
- Upload zone
- Platform selection
- Settings
- Live preview

## Browser Support

Works on all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Troubleshooting

**Preview not showing?**
- Check that `mediaUrl` is provided
- Verify `originalDimensions` has width and height
- Ensure platforms are selected

**Wrong aspect ratio?**
- Verify `platformMappings` has correct aspect ratio keys
- Check that aspect ratio exists in `RESOLUTIONS`

**Image not loading?**
- Ensure media URL is publicly accessible
- Check Supabase storage permissions
- Verify image format is supported (JPG, PNG, WebP)

## Future Enhancements

- [ ] Drag-to-reframe for cropped media
- [ ] Comparison slider (before/after crop)
- [ ] Download preview images
- [ ] Preset templates for each platform
