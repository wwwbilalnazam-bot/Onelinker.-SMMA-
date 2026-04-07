"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn, initials } from "@/lib/utils";

// ════════════════════════════════════════════════════════════
// WORKSPACE SWITCHER — dropdown to switch active workspace
// ════════════════════════════════════════════════════════════

interface WorkspaceSwitcherProps {
  collapsed: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { workspaces, workspace: activeWorkspace, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!activeWorkspace) return null;

  function handleSelect(id: string) {
    switchWorkspace(id);
    setOpen(false);
    router.refresh();
  }

  const avatarBg = "bg-muted/60";

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-foreground font-semibold text-sm mx-auto"
        title={activeWorkspace.name}
      >
        {activeWorkspace.logo_url ? (
          <img
            src={activeWorkspace.logo_url}
            alt=""
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          initials(activeWorkspace.name)
        )}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm transition-all hover:border-border",
          open && "border-border ring-1 ring-border/40"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-foreground",
            avatarBg
          )}
        >
          {activeWorkspace.logo_url ? (
            <img
              src={activeWorkspace.logo_url}
              alt=""
              className="h-full w-full rounded-md object-cover"
            />
          ) : (
            initials(activeWorkspace.name)
          )}
        </div>

        <span className="flex-1 truncate text-left font-medium text-foreground text-xs">
          {activeWorkspace.name}
        </span>

        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[200px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="p-1.5 space-y-0.5">
            <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Workspaces
            </p>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60 text-xs font-bold text-foreground">
                  {ws.logo_url ? (
                    <img
                      src={ws.logo_url}
                      alt=""
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    initials(ws.name)
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate text-xs font-medium text-foreground">
                    {ws.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {ws.plan}
                  </p>
                </div>
                {ws.id === activeWorkspace.id && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-border p-1.5">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/workspace/new");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
