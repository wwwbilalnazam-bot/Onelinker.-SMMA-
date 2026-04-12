import {
  publishPhotoStory,
  publishVideoStory,
} from "@/lib/meta/stories/facebook";
import {
  publishIGStory,
  validateIGStoryEligibility,
} from "@/lib/meta/stories/instagram";

jest.mock("@/lib/meta/client", () => ({
  graphPost: jest.fn(),
  graphGet: jest.fn(),
}));

describe("Facebook Stories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("publishes photo story successfully", async () => {
    const { graphPost } = require("@/lib/meta/client");
    graphPost.mockResolvedValueOnce({ id: "story_123" });

    const result = await publishPhotoStory({
      pageId: "page_123",
      pageAccessToken: "token_xxx",
      imageUrl: "https://example.com/image.jpg",
      caption: "Test story",
    });

    expect(result.id).toBe("story_123");
    expect(result.platform).toBe("facebook");
    expect(graphPost).toHaveBeenCalledWith(
      "/page_123/photo_stories",
      expect.objectContaining({
        url: "https://example.com/image.jpg",
        caption: "Test story",
      }),
      "token_xxx"
    );
  });

  it("publishes video story with 3-step upload", async () => {
    const { graphPost } = require("@/lib/meta/client");

    graphPost
      .mockResolvedValueOnce({
        upload_session_id: "session_123",
        upload_url: "https://upload.example.com/video",
      })
      .mockResolvedValueOnce({ id: "story_456" });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["video_data"]),
    });

    const result = await publishVideoStory({
      pageId: "page_123",
      pageAccessToken: "token_xxx",
      videoUrl: "https://example.com/video.mp4",
      caption: "Video story",
    });

    expect(result.id).toBe("story_456");
    expect(result.platform).toBe("facebook");

    // Verify 3 calls: start, upload, finish
    expect(graphPost).toHaveBeenCalledTimes(2);
    expect(graphPost).toHaveBeenNthCalledWith(
      1,
      "/page_123/video_stories",
      { upload_phase: "start" },
      "token_xxx"
    );
    expect(graphPost).toHaveBeenNthCalledWith(
      2,
      "/page_123/video_stories",
      {
        upload_session_id: "session_123",
        upload_phase: "finish",
        caption: "Video story",
      },
      "token_xxx"
    );
  });

  it("retries on timeout for video story", async () => {
    const { graphPost } = require("@/lib/meta/client");

    graphPost
      .mockRejectedValueOnce({
        error: { code: 2, message: "timeout" },
      })
      .mockResolvedValueOnce({
        upload_session_id: "session_123",
        upload_url: "https://upload.example.com/video",
      })
      .mockResolvedValueOnce({ id: "story_456" });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["video_data"]),
    });

    const result = await publishVideoStory({
      pageId: "page_123",
      pageAccessToken: "token_xxx",
      videoUrl: "https://example.com/video.mp4",
    });

    expect(result.id).toBe("story_456");
    // Should have retried after timeout
    expect(graphPost).toHaveBeenCalledTimes(3); // 1 failed + 2 successful
  });

  it("throws permission error with helpful message", async () => {
    const { graphPost } = require("@/lib/meta/client");
    graphPost.mockRejectedValueOnce({
      error: { code: 200, message: "permission denied" },
    });

    await expect(
      publishPhotoStory({
        pageId: "page_123",
        pageAccessToken: "invalid_token",
        imageUrl: "https://example.com/image.jpg",
      })
    ).rejects.toThrow("Permission denied");
  });
});

describe("Instagram Stories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates IG account eligibility (Business Account)", async () => {
    const { graphGet } = require("@/lib/meta/client");
    graphGet.mockResolvedValueOnce({ account_type: "BUSINESS" });

    const result = await validateIGStoryEligibility("ig_123", "token_xxx");

    expect(result).toBe(true);
    expect(graphGet).toHaveBeenCalledWith(
      "/ig_123",
      { fields: "account_type" },
      "token_xxx"
    );
  });

  it("rejects Creator Account eligibility", async () => {
    const { graphGet } = require("@/lib/meta/client");
    graphGet.mockResolvedValueOnce({ account_type: "CREATOR" });

    const result = await validateIGStoryEligibility("ig_123", "token_xxx");

    expect(result).toBe(false);
  });

  it("publishes IG story with container polling", async () => {
    const { graphPost, graphGet } = require("@/lib/meta/client");

    graphPost
      .mockResolvedValueOnce({ id: "container_123" })
      .mockResolvedValueOnce({ id: "story_789" });

    graphGet.mockResolvedValueOnce({ status_code: "FINISHED" });

    const result = await publishIGStory({
      igUserId: "ig_123",
      accessToken: "token_xxx",
      mediaUrl: "https://example.com/image.jpg",
      isVideo: false,
    });

    expect(result.id).toBe("story_789");
    expect(result.platform).toBe("instagram");

    // Verify container creation
    expect(graphPost).toHaveBeenNthCalledWith(
      1,
      "/ig_123/media",
      expect.objectContaining({
        media_type: "STORIES",
        image_url: "https://example.com/image.jpg",
      }),
      "token_xxx"
    );

    // Verify status polling
    expect(graphGet).toHaveBeenCalledWith(
      "/container_123",
      { fields: "status_code,status" },
      "token_xxx"
    );

    // Verify publish
    expect(graphPost).toHaveBeenNthCalledWith(
      2,
      "/ig_123/media_publish",
      { creation_id: "container_123" },
      "token_xxx"
    );
  });

  it("throws error if container processing fails", async () => {
    const { graphPost, graphGet } = require("@/lib/meta/client");

    graphPost.mockResolvedValueOnce({ id: "container_123" });
    graphGet.mockResolvedValueOnce({
      status_code: "ERROR",
      status: "Invalid video",
    });

    await expect(
      publishIGStory({
        igUserId: "ig_123",
        accessToken: "token_xxx",
        mediaUrl: "https://example.com/video.mp4",
        isVideo: true,
      })
    ).rejects.toThrow("Container processing failed");
  });

  it("maps permission errors to user-friendly message", async () => {
    const { graphPost } = require("@/lib/meta/client");
    graphPost.mockRejectedValueOnce({
      error: {
        code: 200,
        message: "permission denied for instagram_content_publish",
      },
    });

    await expect(
      publishIGStory({
        igUserId: "ig_123",
        accessToken: "invalid_token",
        mediaUrl: "https://example.com/image.jpg",
        isVideo: false,
      })
    ).rejects.toThrow("Instagram account ineligible");
  });
});
