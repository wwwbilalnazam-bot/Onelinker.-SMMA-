import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCaptions } from "@/lib/claude/caption";
import type { AiTone, Platform } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      topic: string;
      tone: AiTone;
      platform: Platform;
      keywords?: string;
      workspaceId: string;
    };

    if (!body.topic?.trim() || !body.tone || !body.platform || !body.workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await generateCaptions(
      { topic: body.topic, tone: body.tone, platform: body.platform, keywords: body.keywords },
      body.workspaceId
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[api/ai/captions]", err);
    const message = err instanceof Error ? err.message : "Failed to generate captions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
