import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// POST /api/profile/upload-avatar
// Uploads user avatar to storage and updates profile

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, and WebP are allowed." }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Upload to Supabase Storage
    // Using workspace-logos bucket which is already configured as public
    const filename = `${userId}-${Date.now()}.${file.type.split("/")[1]}`;
    const filePath = `avatars/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("workspace-logos")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[api/profile/upload-avatar] Upload error:", {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        bucketName: "workspace-logos",
        filePath,
        details: JSON.stringify(uploadError),
      });
      return NextResponse.json(
        {
          error: uploadError.message || "Failed to upload file",
          details: process.env.NODE_ENV === "development" ? uploadError.message : undefined
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("workspace-logos")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData?.publicUrl;

    if (!avatarUrl) {
      return NextResponse.json({ error: "Failed to get public URL" }, { status: 500 });
    }

    // Update user profile with avatar URL
    const service = createServiceClient();
    const { error: updateError } = await service
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("[api/profile/upload-avatar] Update error:", updateError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    console.error("[api/profile/upload-avatar] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
