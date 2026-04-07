"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Send,
  CalendarClock,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { generateCaptions } from "@/lib/claude/caption";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PLATFORM_NAMES } from "@/lib/utils";
import { Platform, AiTone } from "@/types";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════
// STEP 3 — FIRST POST
// Mini composer: pick account, write caption, post now or schedule.
// ════════════════════════════════════════════════════════════

const postSchema = z.object({
  caption: z
    .string()
    .min(1, "Write something before posting")
    .max(2200, "Caption is too long"),
});

type PostFormValues = z.infer<typeof postSchema>;

interface SocialAccountRow {
  id: string;
  platform: Platform;
  account_name: string;
  outstand_account_id: string;
}

interface StepFirstPostProps {
  workspaceId: string;
  userId: string;
  connectedAccountIds: string[];
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
  isCompleting: boolean;
}

export function StepFirstPost({
  workspaceId,
  userId,
  connectedAccountIds,
  onComplete,
  onSkip,
  onBack,
  isCompleting,
}: StepFirstPostProps) {
  const supabase = createClient();

  const [accounts, setAccounts] = useState<SocialAccountRow[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [postMode, setPostMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [posted, setPosted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { caption: "" },
  });

  const captionValue = watch("caption");

  // ── Load connected accounts ──────────────────────────────

  async function loadAccounts() {
    if (accountsLoaded) return;
    setAccountsLoaded(true);

    const query = supabase
      .from("social_accounts")
      .select("id, platform, account_name, outstand_account_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    const { data } = connectedAccountIds.length
      ? await query.in("id", connectedAccountIds)
      : await query;

    const rows = (data ?? []) as SocialAccountRow[];
    setAccounts(rows);
    if (rows.length > 0) setSelectedAccountId(rows[0]?.id ?? null);
  }

  // Load accounts on first render
  if (!accountsLoaded) loadAccounts();

  // ── AI caption generation ────────────────────────────────

  async function handleGenerateCaption() {
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAccount) {
      toast.error("Select an account first");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateCaptions({
        platform: selectedAccount.platform,
        topic: "Introducing our brand — excited to be here!",
        tone: AiTone.Casual,
      }, workspaceId);

      if (result.variations?.[0]) {
        setValue("caption", result.variations[0], { shouldValidate: true });
        toast.success("Caption generated!");
      }
    } catch {
      toast.error("Couldn't generate caption. Try writing your own!");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────

  async function onSubmit(values: PostFormValues) {
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    if (!selectedAccount) {
      toast.error("Please select an account");
      return;
    }

    let scheduledAt: string | null = null;
    if (postMode === "schedule") {
      if (!scheduleDate) {
        toast.error("Pick a date to schedule");
        return;
      }
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      if (new Date(scheduledAt) <= new Date()) {
        toast.error("Schedule time must be in the future");
        return;
      }
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          caption: values.caption,
          accountIds: [selectedAccount.outstand_account_id],
          ...(scheduledAt ? { scheduledAt } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create post");
      }

      setPosted(true);
      toast.success(
        postMode === "now" ? "Post published!" : "Post scheduled!"
      );

      setTimeout(() => onComplete(), 1500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create post";
      toast.error(msg);
    }
  }

  // ── Success state ────────────────────────────────────────

  if (posted) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-teal/15">
            <CheckCircle2 className="h-8 w-8 text-brand-teal" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {postMode === "now" ? "Post published!" : "Post scheduled!"}
        </h2>
        <p className="text-muted-foreground">
          Taking you to your dashboard...
        </p>
        <Loader2 className="h-5 w-5 animate-spin mx-auto mt-4 text-primary" />
      </div>
    );
  }

  // ── Default: show no accounts message ───────────────────

  const hasNoAccounts = accountsLoaded && accounts.length === 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8">
      {/* Step header */}
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/15 mb-4">
          <Send className="h-5 w-5 text-brand-teal" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Create your first post
        </h2>
        <p className="text-muted-foreground mt-1.5">
          Write something, let AI help, or skip and do it later.
        </p>
      </div>

      {hasNoAccounts ? (
        // ── No accounts connected ──────────────────────────
        <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-center mb-6">
          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            No accounts connected
          </p>
          <p className="text-xs text-muted-foreground">
            Go back and connect a social account to post.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Account selector */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Post to</Label>
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      selectedAccountId === account.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/50 text-foreground hover:border-primary/50"
                    )}
                  >
                    <span className="capitalize">
                      {PLATFORM_NAMES[account.platform] ?? account.platform}
                    </span>
                    <span className="text-muted-foreground font-normal truncate max-w-[100px]">
                      @{account.account_name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="caption" className="text-sm font-medium">
                Caption
              </Label>
              <button
                type="button"
                onClick={handleGenerateCaption}
                disabled={isGenerating || !selectedAccountId}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                AI Write
              </button>
            </div>
            <Textarea
              id="caption"
              placeholder="What's on your mind? Share an update, announcement, or story..."
              rows={5}
              className={cn(
                "resize-none bg-background/50 text-sm leading-relaxed",
                errors.caption && "border-destructive"
              )}
              {...register("caption")}
            />
            <div className="flex items-center justify-between">
              {errors.caption ? (
                <p className="text-xs text-destructive">
                  {errors.caption.message}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {captionValue.length} / 2200
              </span>
            </div>
          </div>

          {/* Post mode toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">When to post</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPostMode("now")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all",
                  postMode === "now"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/50 text-foreground hover:border-primary/50"
                )}
              >
                <Send className="h-4 w-4" />
                Post now
              </button>
              <button
                type="button"
                onClick={() => setPostMode("schedule")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all",
                  postMode === "schedule"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/50 text-foreground hover:border-primary/50"
                )}
              >
                <CalendarClock className="h-4 w-4" />
                Schedule it
              </button>
            </div>

            {/* Schedule date/time */}
            {postMode === "schedule" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={onSkip}
                disabled={isCompleting}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>

            <Button
              type="submit"
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6"
              disabled={isSubmitting || isCompleting || !selectedAccountId}
            >
              {isSubmitting || isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {postMode === "now" ? "Publish" : "Schedule"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* No accounts: actions */}
      {hasNoAccounts && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <Button
            onClick={onSkip}
            disabled={isCompleting}
            className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6"
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
