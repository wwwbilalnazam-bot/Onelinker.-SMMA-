import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";

// ════════════════════════════════════════════════════════════
// AI CLIENT — OpenAI GPT-4o
// All AI features use gpt-4o-mini for fast, cost-effective generation.
// Usage is tracked and enforced against plan limits.
// ════════════════════════════════════════════════════════════

export const AI_MODEL = "gpt-4o-mini";
export const AI_MAX_TOKENS = 2048;

// Singleton client
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your environment variables."
    );
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// ── Core completion function ──────────────────────────────────

export interface ClaudeCompletionOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeCompletionResult {
  content: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export async function runCompletion(
  options: ClaudeCompletionOptions
): Promise<ClaudeCompletionResult> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: options.maxTokens ?? AI_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  return {
    content,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  };
}

// ── Streaming completion (for real-time UI) ───────────────────

export async function runStreamingCompletion(
  options: ClaudeCompletionOptions,
  onChunk: (chunk: string) => void
): Promise<ClaudeCompletionResult> {
  const client = getOpenAIClient();

  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: options.maxTokens ?? AI_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userMessage },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      onChunk(delta);
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens;
      outputTokens = chunk.usage.completion_tokens;
    }
  }

  return {
    content: fullContent,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  };
}

// ── Track AI usage after successful call ──────────────────────

export async function trackAIUsage(workspaceId: string): Promise<void> {
  const serviceClient = createServiceClient();
  const currentMonth = new Date().toISOString().slice(0, 7);

  await serviceClient.rpc("increment_ai_usage", {
    p_workspace_id: workspaceId,
    p_month: currentMonth,
  });
}

// ── Parse numbered list output ────────────────────────────────
// Many AI responses return "1. item\n2. item\n3. item"

export function parseNumberedList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((line) => line.length > 0);
}

// ── Parse JSON output safely ──────────────────────────────────

export function parseJsonOutput<T>(text: string): T | null {
  // Strip markdown code blocks if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract JSON array/object from mixed content
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);

    const jsonStr = arrayMatch?.[0] ?? objectMatch?.[0];
    if (jsonStr) {
      try {
        return JSON.parse(jsonStr) as T;
      } catch {
        return null;
      }
    }

    return null;
  }
}

// ── Build Server-Sent Events (SSE) stream response ───────────

export function createSSEStream(
  generator: (send: (chunk: string) => void) => Promise<void>
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (chunk: string) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
        );
      };

      try {
        await generator(send);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}
