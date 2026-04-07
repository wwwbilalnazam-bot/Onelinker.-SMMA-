import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rewriteCaption } from "@/lib/claude/caption";
import type { AiTone, Platform } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      content: string;
      tone: AiTone;
      platform?: Platform;
      workspaceId: string;
    };

    if (!body.content?.trim() || !body.tone || !body.workspaceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await rewriteCaption(
      { content: body.content, tone: body.tone, platform: body.platform },
      body.workspaceId
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[api/ai/rewrite]", err);
    const message = err instanceof Error ? err.message : "Failed to rewrite caption";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
