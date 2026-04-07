import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHashtags } from "@/lib/claude/hashtags";
import type { Platform } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      content: string;
      platform: Platform;
      workspaceId: string;
    };

    if (!body.content?.trim() || !body.platform || !body.workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await generateHashtags(
      { content: body.content, platform: body.platform },
      body.workspaceId
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[api/ai/hashtags]", err);
    const message = err instanceof Error ? err.message : "Failed to generate hashtags";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
