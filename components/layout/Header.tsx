"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Moon,
  Sun,
  PenSquare,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn, initials } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { MobileSidebar } from "./Sidebar";

// ════════════════════════════════════════════════════════════
// HEADER — top bar with search, actions, user menu
// ════════════════════════════════════════════════════════════

interface HeaderProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme, setTheme } = useTheme();
  const { workspace: activeWorkspace } = useWorkspace();

  // Prefer workspace logo for the avatar; fall back to user profile photo
  const avatarSrc = activeWorkspace?.logo_url || user.avatarUrl;

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  const displayName = user.fullName || user.email.split("@")[0] || "User";

  return (
    <header className="relative z-40 flex h-14 items-center gap-2 sm:gap-3 border-b border-border/60 bg-card/80 backdrop-blur-md px-3 sm:px-5 shrink-0">

      {/* Mobile hamburger */}
      <MobileSidebar />

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto">

        {/* New post CTA — premium gradient button */}
        <Link
          href="/create?sheet=true"
          className="btn btn-primary btn-md hidden sm:inline-flex rounded-lg"
        >
          <PenSquare className="h-3.5 w-3.5" />
          New Post
        </Link>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-border/50 mx-2" />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="btn btn-icon btn-icon-md"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifications */}
        <button
          className="btn btn-icon btn-icon-md relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-brand-coral ring-2 ring-card" />
        </button>

        {/* User menu */}
        <div ref={userMenuRef} className="relative ml-0.5">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1 transition-all duration-150",
              "hover:border-border/60 hover:bg-muted/50",
              userMenuOpen && "border-border/60 bg-muted/50"
            )}
          >
            {/* Avatar */}
            <div className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center overflow-hidden text-[11px] font-bold text-foreground shrink-0 ring-1 ring-border/40">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(displayName)
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-border/80 bg-popover overflow-hidden animate-scale-in"
              style={{ boxShadow: "var(--tw-shadow)", "--tw-shadow": "0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.16), 0 0 0 1px rgba(255,255,255,0.04)" } as React.CSSProperties}
            >
              {/* User info */}
              <div className="flex items-center gap-3 px-3.5 py-3 border-b border-border/50">
                <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center overflow-hidden text-sm font-bold text-foreground shrink-0 ring-1 ring-border/40">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials(displayName)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Plan row */}
              {activeWorkspace && (
                <div className="px-3.5 py-2 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Plan</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full capitalize",
                      activeWorkspace.plan === "free"
                        ? "bg-muted/80 text-muted-foreground"
                        : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    )}>
                      {activeWorkspace.plan}
                    </span>
                  </div>
                </div>
              )}

              {/* Nav items */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="menu-item"
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="menu-item"
                >
                  <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                  Settings
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setUserMenuOpen(false)}
                  className="menu-item"
                >
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  Billing
                </Link>
              </div>

              {/* Upgrade nudge */}
              {activeWorkspace?.plan === "free" && (
                <div className="mx-1.5 mb-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Upgrade your plan</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                    Unlock more posts, AI features, unified inbox, and analytics.
                  </p>
                  <Link
                    href="/billing"
                    onClick={() => setUserMenuOpen(false)}
                    className="btn btn-primary btn-xs w-full rounded-md"
                  >
                    View plans
                  </Link>
                </div>
              )}

              {/* Sign out */}
              <div className="border-t border-border/50 p-1.5">
                <button
                  onClick={handleSignOut}
                  className="menu-item-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
