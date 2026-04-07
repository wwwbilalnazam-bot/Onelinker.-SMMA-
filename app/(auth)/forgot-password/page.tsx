"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, ArrowLeft, CheckCircle, KeyRound, ArrowRight, ExternalLink, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/ui/animated-section";
import toast from "react-hot-toast";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  async function onSubmit(values: ForgotFormValues) {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSentToEmail(values.email);
    setEmailSent(true);
  }

  // Get email provider for quick-open button
  const emailDomain = sentToEmail.split("@")[1]?.toLowerCase() ?? "";
  const emailProviders: Record<string, { name: string; url: string }> = {
    "gmail.com": { name: "Open Gmail", url: "https://mail.google.com" },
    "outlook.com": { name: "Open Outlook", url: "https://outlook.live.com" },
    "hotmail.com": { name: "Open Outlook", url: "https://outlook.live.com" },
    "yahoo.com": { name: "Open Yahoo Mail", url: "https://mail.yahoo.com" },
  };
  const emailProvider = emailProviders[emailDomain];

  // ── Success state ────────────────────────────────────────

  if (emailSent) {
    return (
      <AnimatedSection animation="fade-up" delay={100}>
      <div className="w-full max-w-[420px] space-y-6">
        {/* Success icon */}
        <div className="relative w-fit">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Mail className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-md animate-scale-in">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Check your inbox
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-semibold text-foreground break-all">{sentToEmail}</span>
          </p>
        </div>

        {/* Tips card */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-foreground">Didn&apos;t receive it?</p>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/40 mt-0.5">1.</span>
              Check your spam or junk folder
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/40 mt-0.5">2.</span>
              Make sure you entered the correct email
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/40 mt-0.5">3.</span>
              The link expires in 1 hour
            </li>
          </ul>
        </div>

        <div className="space-y-2.5">
          {/* Quick-open email provider */}
          {emailProvider && (
            <a href={emailProvider.url} target="_blank" rel="noopener noreferrer">
              <Button
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-glow-sm hover:shadow-glow transition-all"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {emailProvider.name}
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl"
            onClick={() => setEmailSent(false)}
          >
            Try a different email
          </Button>
          <Link href="/login" className="block">
            <Button variant="ghost" className="w-full h-10 text-muted-foreground text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
      </AnimatedSection>
    );
  }

  // ── Form state ───────────────────────────────────────────

  return (
    <AnimatedSection animation="fade-up" delay={100}>
    <div className="w-full max-w-[420px] space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Reset password
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              className={cn(
                "pl-10 h-12 rounded-xl bg-background border-border/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
                errors.email && "border-destructive focus-visible:ring-destructive/20"
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm shadow-glow-sm hover:shadow-glow transition-all"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Send reset link
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </form>

      <div className="h-px bg-border/30" />

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
    </AnimatedSection>
  );
}
