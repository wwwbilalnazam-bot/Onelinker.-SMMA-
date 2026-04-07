"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2,
  ArrowRight,
  Loader2,
  Check,
  Users,
  Calendar,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/ui/animated-section";
import toast from "react-hot-toast";

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

const FREE_FEATURES = [
  { icon: Users, label: "3 connected social accounts" },
  { icon: Calendar, label: "20 scheduled posts / month" },
  { icon: Sparkles, label: "AI caption generator" },
  { icon: MessageSquare, label: "Social inbox" },
];

export default function NewWorkspacePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  }

  function handleSlugChange(val: string) {
    setSlug(slugify(val));
    setSlugEdited(true);
  }

  const slugValid = slug.length >= 2;
  const nameValid = name.trim().length >= 2;

  // Debounced slug availability check
  useEffect(() => {
    if (!slugValid) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    setSlugAvailable(null);
    const timer = setTimeout(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("workspaces")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        setSlugAvailable(!data);
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, slugValid]);

  async function handleCreate() {
    if (!nameValid || !slugValid) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        setCreating(false);
        return;
      }

      toast.success(`Workspace "${name.trim()}" created!`);
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Something went wrong — please try again");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/[0.03] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <Image src="/logo.png" alt="Onelinker" width={40} height={40} className="rounded-xl shadow-glow-sm" />
          <span className="text-2xl font-bold text-gradient">Onelinker</span>
        </div>

        {/* Card */}
        <AnimatedSection animation="scale" delay={100}>
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-xl shadow-black/[0.03] overflow-hidden">
          {/* Header section */}
          <div className="px-8 pt-8 pb-6 border-b border-border/40 bg-gradient-to-b from-primary/[0.04] to-transparent">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-5">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Create a new workspace
            </h1>
            <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">
              A workspace holds your social accounts, posts, and team members.
            </p>
          </div>

          {/* Form section */}
          <div className="px-8 py-6 space-y-5">
            {/* Workspace name */}
            <div className="space-y-2">
              <Label htmlFor="ws-name" className="text-[15px] font-medium">
                Workspace name
              </Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Brand, Agency Name, etc."
                className="h-11 bg-background/60 text-[15px] border-border/60 focus-visible:ring-primary/30"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="ws-slug" className="text-[15px] font-medium">
                Workspace URL
              </Label>
              <div
                className={cn(
                  "flex items-center rounded-lg border bg-background/60 overflow-hidden transition-all",
                  "focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40",
                  slugValid && slugAvailable === false
                    ? "border-red-400/60"
                    : "border-border/60"
                )}
              >
                <span className="px-3.5 py-2.5 text-[14px] text-muted-foreground bg-muted/40 border-r border-border/60 shrink-0 font-medium">
                  onelinker.ai/
                </span>
                <input
                  id="ws-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-brand"
                  className="flex-1 px-3.5 py-2.5 text-[15px] bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                {slugValid && (
                  <div className="mr-3 shrink-0">
                    {slugChecking ? (
                      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    ) : slugAvailable === true ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
                        <Check className="h-3 w-3 text-emerald-500" />
                      </div>
                    ) : slugAvailable === false ? (
                      <span className="text-xs text-red-400 font-medium">
                        Taken
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground/80">
                Only lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* What's included */}
            <div className="rounded-xl bg-gradient-to-br from-primary/[0.04] to-primary/[0.02] border border-primary/10 px-5 py-4">
              <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-3">
                Free plan includes
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {FREE_FEATURES.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 text-[13px] text-foreground/80"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 shrink-0">
                      <Icon className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-5 border-t border-border/40 bg-muted/[0.03] flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-[14px] text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Cancel
            </button>
            <Button
              onClick={handleCreate}
              disabled={
                creating || !nameValid || !slugValid || slugAvailable === false
              }
              size="lg"
              className={cn(
                "ml-auto gap-2.5 bg-primary hover:bg-primary/90 text-white font-semibold px-6 h-11 text-[15px] rounded-xl",
                "shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              )}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {creating ? "Creating..." : "Create workspace"}
            </Button>
          </div>
        </div>
        </AnimatedSection>

        <p className="text-center text-[13px] text-muted-foreground/70 mt-6">
          You can upgrade to Creator or Agency anytime from Settings → Billing.
        </p>
      </div>
    </div>
  );
}
