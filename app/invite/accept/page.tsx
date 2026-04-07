"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AcceptState = "loading" | "checking-auth" | "ready" | "accepting" | "success" | "error" | "expired" | "login-required";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<AcceptState>("loading");
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No invitation token provided.");
      return;
    }

    // Check if user is authenticated
    async function checkAuth() {
      setState("checking-auth");
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setState("login-required");
        return;
      }

      setState("ready");
    }

    checkAuth();
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setState("accepting");

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setState("login-required");
          return;
        }
        if (res.status === 410) {
          setState("expired");
          setMessage(data.error);
          return;
        }
        if (res.status === 409) {
          // Already a member — redirect to dashboard
          setState("success");
          setMessage("You are already a member of this workspace.");
          setWorkspaceName(data.workspace?.name ?? "");
          setTimeout(() => router.push("/home"), 2000);
          return;
        }
        setState("error");
        setMessage(data.error ?? "Failed to accept invitation");
        return;
      }

      setState("success");
      setWorkspaceName(data.workspace?.name ?? "Workspace");
      setRole(data.role);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        // Set the workspace cookie so dashboard loads the right workspace
        document.cookie = `onelinker_workspace_id=${data.workspace?.id};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
        router.push("/home");
      }, 2500);
    } catch {
      setState("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  function handleLogin() {
    // Redirect to login with a return URL that includes the token
    const returnUrl = `/invite/accept?token=${token}`;
    router.push(`/login?next=${encodeURIComponent(returnUrl)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-8 space-y-6 text-center shadow-lg">
        {/* Loading */}
        {(state === "loading" || state === "checking-auth") && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying invitation...</p>
          </>
        )}

        {/* Login required */}
        {state === "login-required" && (
          <>
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You need to sign in or create an account to accept this invitation.
              </p>
            </div>
            <Button onClick={handleLogin} className="w-full bg-primary text-white">
              Sign in to continue
            </Button>
          </>
        )}

        {/* Ready to accept */}
        {state === "ready" && (
          <>
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">You&apos;ve been invited!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Click below to accept the invitation and join the workspace.
              </p>
            </div>
            <Button onClick={handleAccept} className="w-full bg-primary text-white">
              Accept Invitation
            </Button>
          </>
        )}

        {/* Accepting */}
        {state === "accepting" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Joining workspace...</p>
          </>
        )}

        {/* Success */}
        {state === "success" && (
          <>
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Welcome!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {workspaceName
                  ? <>You&apos;ve joined <strong>{workspaceName}</strong>{role ? ` as ${role}` : ""}.</>
                  : message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Redirecting to dashboard...</p>
            </div>
          </>
        )}

        {/* Expired */}
        {state === "expired" && (
          <>
            <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Invitation expired</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {message || "This invitation has expired. Please ask the workspace owner to send a new one."}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/home")} className="w-full">
              Go to Dashboard
            </Button>
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {message || "Unable to process this invitation."}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/home")} className="w-full">
              Go to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
