"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StepWorkspace } from "./StepWorkspace";
import { StepConnectAccount } from "./StepConnectAccount";
import { StepFirstPost } from "./StepFirstPost";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════
// ONBOARDING FLOW
// 3-step wizard guiding new users through:
//   Step 1 — Set up workspace (name + logo)
//   Step 2 — Connect first social account
//   Step 3 — Create or schedule first post
// Progress is saved to Supabase. Completing OR skipping
// any step marks the user as onboarded.
// ════════════════════════════════════════════════════════════

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
  userName: string;
  workspaceId: string;
  workspaceName: string;
}

const STEPS = [
  { id: 1, label: "Workspace" },
  { id: 2, label: "Connect" },
  { id: 3, label: "First post" },
] as const;

export function OnboardingFlow({
  userId,
  userEmail,
  userName,
  workspaceId,
  workspaceName,
}: OnboardingFlowProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);
  const [data, setData] = useState({
    workspaceName: workspaceName,
    workspaceLogoUrl: null as string | null,
    connectedAccountIds: [] as string[],
  });

  // ── Mark user as onboarded ─────────────────────────────

  const completeOnboarding = useCallback(async () => {
    setIsCompleting(true);
    try {
      // Use the finish endpoint which directly updates via Supabase REST API
      const res = await fetch("/api/onboarding/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      const data = await res.json() as { success?: boolean };
      if (!data.success) {
        throw new Error("Failed to complete onboarding");
      }

      toast.success("You're all set! Welcome to Onelinker.");
      // Hard redirect forces full server re-render and fresh profile check
      window.location.href = "/home";
    } catch (err) {
      console.error("[OnboardingFlow] Error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsCompleting(false);
    }
  }, [userId]);

  // ── Step navigation ────────────────────────────────────

  const goToNextStep = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    } else {
      completeOnboarding();
    }
  }, [currentStep, completeOnboarding]);

  const goToPrevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  // ── Update shared data ─────────────────────────────────

  const updateData = useCallback(
    (updates: Partial<typeof data>) => {
      setData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Onelinker" width={28} height={28} className="rounded-lg shadow-glow-sm" />
          <span className="font-bold text-gradient">Onelinker</span>
        </div>

        <button
          onClick={completeOnboarding}
          disabled={isCompleting}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip setup →
        </button>
      </header>

      {/* Progress */}
      <div className="relative z-10 px-6 pt-8 pb-4 max-w-xl mx-auto w-full">
        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    step.id < currentStep
                      ? "bg-primary border-primary text-white"
                      : step.id === currentStep
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground bg-background"
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    step.id === currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3 mb-5 transition-all",
                    step.id < currentStep ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="animate-fade-in">
          {currentStep === 1 && (
            <StepWorkspace
              userId={userId}
              workspaceId={workspaceId}
              initialName={data.workspaceName}
              onComplete={(name, logoUrl) => {
                updateData({ workspaceName: name, workspaceLogoUrl: logoUrl });
                goToNextStep();
              }}
              onSkip={goToNextStep}
            />
          )}

          {currentStep === 2 && (
            <StepConnectAccount
              workspaceId={workspaceId}
              onComplete={(accountIds) => {
                updateData({ connectedAccountIds: accountIds });
                goToNextStep();
              }}
              onSkip={goToNextStep}
              onBack={goToPrevStep}
            />
          )}

          {currentStep === 3 && (
            <StepFirstPost
              workspaceId={workspaceId}
              userId={userId}
              connectedAccountIds={data.connectedAccountIds}
              onComplete={completeOnboarding}
              onSkip={completeOnboarding}
              onBack={goToPrevStep}
              isCompleting={isCompleting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
