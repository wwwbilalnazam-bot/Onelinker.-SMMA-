"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, Zap, Shield, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/ui/animated-section";
import toast from "react-hot-toast";

// ── Validation schema ─────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Component ─────────────────────────────────────────────────

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/home";

  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // ── Email + password sign in ────────────────────────────────

  async function onSubmit(values: LoginFormValues) {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Incorrect email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email address before signing in.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Welcome back!");
    router.push(nextUrl);
    router.refresh();
  }

  // ── Google OAuth ────────────────────────────────────────────

  async function signInWithGoogle() {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      toast.error("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  }

  // ── Meta (Facebook) OAuth ───────────────────────────────────

  async function signInWithMeta() {
    setIsFacebookLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/meta/callback?next=${encodeURIComponent(nextUrl)}&platform=facebook`,
      },
    });

    if (error) {
      toast.error("Failed to sign in with Facebook. Please try again.");
      setIsFacebookLoading(false);
    }
  }

  // ── Magic link ──────────────────────────────────────────────

  async function sendMagicLink() {
    const email = getValues("email");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter your email address first, then click magic link.");
      return;
    }

    setIsMagicLinkLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setMagicLinkSent(true);
      toast.success("Magic link sent! Check your inbox.");
    }
    setIsMagicLinkLoading(false);
  }

  return (
    <AnimatedSection animation="fade-up" delay={100}>
    <div className="w-full max-w-[420px] space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 gap-3 text-sm font-medium border-border/80 hover:bg-accent/60 rounded-xl transition-all hover:shadow-sm"
        onClick={signInWithGoogle}
        disabled={isGoogleLoading || isSubmitting || isFacebookLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>

      {/* Meta (Facebook) OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 gap-3 text-sm font-medium border-border/80 hover:bg-accent/60 rounded-xl transition-all hover:shadow-sm"
        onClick={signInWithMeta}
        disabled={isFacebookLoading || isSubmitting || isGoogleLoading}
      >
        {isFacebookLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FacebookIcon />
        )}
        Continue with Facebook
      </Button>

      {/* Divider */}
      <div className="relative">
        <Separator className="bg-border/40" />
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground/60 uppercase tracking-wider">
          or sign in with email
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
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

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary/80 hover:text-primary transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={cn(
                "pl-10 pr-11 h-12 rounded-xl bg-background border-border/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
                errors.password && "border-destructive focus-visible:ring-destructive/20"
              )}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm shadow-glow-sm hover:shadow-glow transition-all"
          disabled={isSubmitting || isGoogleLoading}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Sign in
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        {/* Magic link */}
        <div className={cn(
          "rounded-xl border border-border/40 p-3 transition-all",
          magicLinkSent ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/20 hover:bg-muted/30"
        )}>
          {magicLinkSent ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 shrink-0">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-600">Magic link sent!</p>
                <p className="text-[11px] text-muted-foreground">Check your inbox and click the link to sign in.</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="w-full flex items-center gap-2.5"
              onClick={sendMagicLink}
              disabled={isMagicLinkLoading || isSubmitting}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 shrink-0">
                {isMagicLinkLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-foreground">Send a magic link</p>
                <p className="text-[11px] text-muted-foreground">Sign in without a password via email</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            </button>
          )}
        </div>
      </form>

      {/* Divider */}
      <div className="h-px bg-border/30" />

      {/* Sign up link */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary hover:underline transition-colors"
        >
          Create free account
        </Link>
      </p>

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4">
        {[
          { icon: Shield, text: "Encrypted" },
          { icon: Zap, text: "99.9% uptime" },
        ].map((item) => (
          <span key={item.text} className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
            <item.icon className="h-3 w-3" />
            {item.text}
          </span>
        ))}
      </div>
    </div>
    </AnimatedSection>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </svg>
  );
}
