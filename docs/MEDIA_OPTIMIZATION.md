# Media Optimization System

Enterprise-grade media processing system for social media scheduling platform. Automatically generates optimized variants for all major social platforms while maintaining flexible manual selection options.

## 📋 Features

### ✨ Auto-Optimization
- **Intelligent Aspect Ratio Selection**: Automatically detects media and generates optimal variants
- **Platform-Aware Processing**: Smart format selection based on selected platforms
- **Quality Management**: Configurable compression levels (High, Standard, Compact)
- **Batch Processing**: Generate all variants in one upload

### 📺 Supported Platforms
| Platform | Aspect Ratios | Recommended | Type |
|----------|---|---|---|
| Instagram Feed | 1:1, 4:5 | 1:1 | Image/Video |
| Instagram Reels | 9:16 | 9:16 | Video |
| Instagram Stories | 9:16 | 9:16 | Image/Video |
| TikTok | 9:16 | 9:16 | Video |
| YouTube Shorts | 9:16 | 9:16 | Video |
| YouTube Standard | 16:9 | 16:9-HD | Video |
| Facebook | 16:9, 1.91:1, 1:1 | 1.91:1 | Image/Video |
| LinkedIn | 16:9, 1:1 | 16:9 | Image/Video |
| Twitter (X) | 16:9, 1:1 | 16:9 | Image/Video |

### 📊 Aspect Ratios
- **Square (1:1)**: 1080×1080
- **Portrait (4:5)**: 1080×1350
- **Vertical (9:16)**: 1080×1920
- **Landscape (16:9)**: 1280×720
- **HD (16:9)**: 1920×1080
- **Widescreen (1.91:1)**: 1200×628

## 🏗️ Architecture

```
lib/media/
├── types.ts                    # Type definitions and constants
├── platform-mapping.ts         # Platform selection logic
├── image-processor.ts          # Image processing (Sharp)
├── video-processor.ts          # Video processing (FFmpeg)
└── media-optimizer.ts          # Main orchestration layer

components/media/
├── MediaUploadZone.tsx        # Upload interface
├── MediaOptimizerSettings.tsx  # Optimization controls
└── MediaVariantsPreview.tsx   # Variant preview & platform view

app/api/media/
└── upload/route.ts            # Upload endpoint

supabase/migrations/
└── add_media_optimization.sql  # Database schema
```

## 🚀 Quick Start

### 1. Setup Database
```bash
# Run migration in Supabase
supabase db push
```

### 2. Install Dependencies
```bash
npm install sharp
# For video processing (optional but recommended)
npm install ffmpeg-static
```

### 3. Configure FFmpeg
For video processing:
```bash
# On macOS (via Homebrew)
brew install ffmpeg

# On Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg

# On Windows
# Download from https://ffmpeg.org/download.html
```

### 4. Use in Compose Page
```tsx
import { MediaUploadZone } from "@/components/media/MediaUploadZone";
import { MediaOptimizerSettings } from "@/components/media/MediaOptimizerSettings";
import { MediaVariantsPreview } from "@/components/media/MediaVariantsPreview";

export function MediaSection() {
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<ResolutionKey>("16:9");
  const [variants, setVariants] = useState<MediaVariant[]>([]);

  const handleMediaUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("selectedPlatforms", JSON.stringify(selectedPlatforms));
    formData.append("autoOptimize", String(autoOptimize));

    const response = await fetch(
      `/api/media/upload?workspaceId=${workspaceId}`,
      { method: "POST", body: formData }
    );

    const data = await response.json();
    setVariants(data.variants);
  };

  return (
    <div className="space-y-6">
      <MediaUploadZone onUpload={handleMediaUpload} />
      <MediaOptimizerSettings
        autoOptimize={autoOptimize}
        onAutoOptimizeChange={setAutoOptimize}
        selectedFormat={selectedFormat}
        onFormatChange={setSelectedFormat}
      />
      {variants.length > 0 && (
        <MediaVariantsPreview variants={variants} platformMappings={{}} />
      )}
    </div>
  );
}
```

## 📱 Image Processing

### Supported Formats
- **Input**: JPEG, PNG, WebP, GIF
- **Output**: WebP (default), JPEG

### Processing Pipeline
1. **Aspect Ratio Detection**: Analyzes original dimensions
2. **Center Crop**: Removes excess pixels while preserving subject
3. **Resize**: Scales to target resolution
4. **Format Conversion**: Converts to WebP for optimal compression
5. **Compression**: Applies 80% quality by default

### Example
```typescript
import { processImage, generateImageVariants } from "@/lib/media/image-processor";

// Process single image
const buffer = await fs.readFile("image.jpg");
const webp = await processImage(buffer, "9:16", {
  quality: 80,
  format: "webp",
  preserveMetadata: true,
});

// Generate all variants
const variants = await generateImageVariants(buffer, ["1:1", "4:5", "9:16", "16:9"], {
  quality: 80,
  format: "webp",
});
```

## 🎥 Video Processing

### Supported Formats
- **Input**: MP4, MOV, WebM, AVI, MKV
- **Output**: MP4 (H.264)

### Processing Pipeline
1. **Detection**: Analyzes video properties (resolution, duration, FPS)
2. **Scaling**: Resizes while maintaining aspect ratio
3. **Padding**: Adds black bars instead of cropping
4. **Encoding**: H.264 with CRF 23-28 (customizable)
5. **Optimization**: Includes moov atom at start for fast seeking

### FFmpeg Settings
```typescript
// Preset levels (speed vs quality trade-off)
- ultrafast: Fastest encoding, largest file
- superfast: Fast, good balance
- veryfast: Medium speed
- faster: Slower, better compression
- fast: Default, balanced

// CRF values (0-51, lower = better quality)
- CRF 18-28: Recommended range
- CRF 23: Default (visually lossless)
```

### Example
```typescript
import { processVideo, generateVideoVariants } from "@/lib/media/video-processor";

// Process video to specific format
const result = await processVideo(
  "/tmp/input.mp4",
  "/tmp/output_9-16.mp4",
  "9:16",
  { crf: 25, preset: "fast" }
);

// Generate multiple variants
const variants = await generateVideoVariants(
  "/tmp/input.mp4",
  ["9:16", "16:9"],
  "/tmp/variants/"
);
```

## 🎯 Platform Mapping Logic

### Auto-Selection Algorithm
When user selects multiple platforms:
1. **Group by Aspect Ratio**: Group platforms by recommended format
2. **Minimize Variants**: Generate only necessary aspect ratios
3. **Best-Fit Selection**: If platform format not available, pick closest match
4. **Priority Order**: Recommended > Supported > Available

### Example
```typescript
import { autoSelectAspectRatios, getOptimalVariants } from "@/lib/media/platform-mapping";

const platforms = ["instagram", "tiktok", "youtube-shorts"];
const available = ["1:1", "9:16", "16:9"];

// Get platform → format mapping
const mapping = autoSelectAspectRatios(platforms, available);
// Result: { instagram: "1:1", tiktok: "9:16", youtube-shorts: "9:16" }

// Get minimal variants needed
const variants = getOptimalVariants(platforms);
// Result: ["1:1", "9:16"] (only 2 instead of 3 formats)
```

## 💾 Database Schema

### Media Files Table
```sql
- id: TEXT (primary key)
- workspace_id: UUID (foreign key)
- original_file_name: TEXT
- media_type: "image" | "video"
- original_resolution: {width, height}
- original_aspect_ratio: NUMERIC
- file_size: BIGINT
- original_url: TEXT
- auto_optimize: BOOLEAN
- selected_platforms: TEXT[]
- status: "pending" | "processing" | "completed" | "failed"
```

### Media Variants Table
```sql
- id: TEXT (primary key)
- media_file_id: TEXT (foreign key)
- aspect_ratio: ResolutionKey
- resolution: {width, height}
- file_size: BIGINT
- url: TEXT
- format: "webp" | "jpg" | "mp4" | "mov"
- generated_at: TIMESTAMP
```

## 🔄 Processing Queue

For async processing of large files:

```typescript
interface ProcessingJob {
  id: string;
  mediaFileId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
```

## 🔐 Security

- **Row Level Security**: All media files require workspace access
- **File Validation**: Magic byte validation (not just extensions)
- **Size Limits**: Per-platform file size enforcement
- **Type Checking**: Strict media type validation
- **Sanitization**: No user input in file paths

## ⚡ Performance

### Processing Speeds (Approximate)
| Task | Time |
|------|------|
| Image (1080p) | 100-300ms |
| Video (1080p, 60s) | 10-30s |
| 4 Image Variants | 500ms-1s |
| Video + Thumbnail | 15-40s |

### Optimization Tips
- Process videos asynchronously
- Use queue system for batch processing
- Cache frequently-generated variants
- Implement progress tracking for long operations

## 🐛 Error Handling

### Common Issues

**Video Processing Fails**
```
Ensure FFmpeg is installed and in PATH
```

**Out of Memory**
```
Reduce video quality (higher CRF values)
Process in queue system with rate limiting
```

**Storage Limits**
```
Implement cleanup of old variants
Use cloud storage for scalability
```

## 📈 Future Enhancements

- [ ] AI-powered smart cropping (detect faces/objects)
- [ ] Drag-to-reframe feature for manual cropping
- [ ] WebP video codec support
- [ ] Subtitle burn-in for videos
- [ ] Animated GIF support
- [ ] Batch downloading of all variants
- [ ] Variant comparison tool
- [ ] Processing statistics and analytics

## 📚 API Reference

### Upload Endpoint
```
POST /api/media/upload?workspaceId=<id>

FormData:
- file: File
- fileName: string
- selectedPlatforms: JSON string array
- autoOptimize: "true" | "false"

Response:
{
  success: boolean
  mediaFile: MediaFile
  variants: MediaVariant[]
}
```

## 🤝 Contributing

When extending the media optimization system:

1. **Add new aspect ratio**: Update `ASPECT_RATIOS` in `types.ts`
2. **Add new platform**: Update `PLATFORM_REQUIREMENTS` in `types.ts`
3. **Update processing**: Modify relevant processor (image/video)
4. **Update UI**: Add controls in optimizer settings component

## 📄 License

Part of Onelinker Social Media Scheduling Platform
