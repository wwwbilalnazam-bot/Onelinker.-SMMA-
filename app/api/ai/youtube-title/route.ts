import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateYoutubeTitle } from "@/lib/claude/caption";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      content: string;
      workspaceId: string;
    };

    if (!body.workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const title = await generateYoutubeTitle(body.content ?? "", body.workspaceId);
    return NextResponse.json({ data: { title } });
  } catch (err) {
    console.error("[api/ai/youtube-title]", err);
    const message = err instanceof Error ? err.message : "Failed to generate title";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
