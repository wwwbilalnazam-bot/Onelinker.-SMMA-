"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, CheckCircle, AlertCircle, ShieldCheck, Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "@/components/ui/animated-section";
import toast from "react-hot-toast";
import Link from "next/link";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

// ── Interactive password checklist ────────────────────────────

function PasswordRequirements({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];

  const allMet = checks.every((c) => c.met);

  return (
    <div className={cn(
      "rounded-xl border p-3.5 space-y-2.5 transition-all duration-300",
      allMet
        ? "bg-emerald-500/5 border-emerald-500/15"
        : "bg-muted/20 border-border/40"
    )}>
      <p className="text-xs font-medium text-muted-foreground">
        Password must have:
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2">
            <div className={cn(
              "h-4 w-4 rounded-full flex items-center justify-center transition-all duration-200",
              check.met
                ? "bg-emerald-500 scale-100"
                : "bg-transparent border border-border/60 scale-90"
            )}>
              {check.met && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className={cn(
              "text-xs transition-colors",
              check.met
                ? "text-emerald-600 font-medium line-through decoration-emerald-500/30"
                : "text-muted-foreground"
            )}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionError(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (!s) setSessionError(true);
          });
        }, 1500);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  // Countdown for redirect after success
  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      router.push("/home");
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(values: ResetFormValues) {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setIsSuccess(true);
  }

  // ── Invalid / expired link ────────────────────────────────

  if (sessionError) {
    return (
      <AnimatedSection animation="fade-up" delay={100}>
      <div className="w-full max-w-[420px] space-y-6">
        <div className="relative w-fit">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/15">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Link expired
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This password reset link has expired or is invalid. Reset links are valid for 1 hour.
          </p>
        </div>

        <div className="rounded-xl bg-muted/20 border border-border/40 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Don&apos;t worry — you can request a new reset link. Make sure to use it within 1 hour of receiving it.
          </p>
        </div>

        <div className="space-y-2.5">
          <Link href="/forgot-password" className="block">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold shadow-glow-sm hover:shadow-glow transition-all">
              Request a new link
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="ghost" className="w-full h-10 text-muted-foreground text-sm">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
      </AnimatedSection>
    );
  }

  // ── Success state ────────────────────────────────────────

  if (isSuccess) {
    return (
      <AnimatedSection animation="fade-up" delay={100}>
      <div className="w-full max-w-[420px] space-y-6">
        <div className="relative w-fit">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-md animate-scale-in">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Password updated!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your password has been changed successfully. Taking you to the dashboard in{" "}
            <span className="font-semibold text-foreground">{countdown}s</span>...
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${((3 - countdown) / 3) * 100}%` }}
          />
        </div>

        <Link href="/home" className="block">
          <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold">
            Go to dashboard now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
      </AnimatedSection>
    );
  }

  // ── Reset form ───────────────────────────────────────────

  return (
    <AnimatedSection animation="fade-up" delay={100}>
    <div className="w-full max-w-[420px] space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Set new password
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Choose a strong password for your account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* New password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            New password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              placeholder="Min. 8 characters"
              className={cn(
                "pl-10 pr-11 h-12 rounded-xl bg-background border-border/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
                errors.password && "border-destructive"
              )}
              {...register("password", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  setPasswordValue(e.target.value),
              })}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirm_password" className="text-sm font-medium text-foreground">
            Confirm new password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat your new password"
              className={cn(
                "pl-10 pr-11 h-12 rounded-xl bg-background border-border/60 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
                errors.confirm_password && "border-destructive"
              )}
              {...register("confirm_password")}
            />
            <button
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-destructive">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {/* Interactive password requirements */}
        <PasswordRequirements password={passwordValue} />

        <Button
          type="submit"
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm shadow-glow-sm hover:shadow-glow transition-all"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Update password
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </form>
    </div>
    </AnimatedSection>
  );
}
