"use client";

import { useContext } from "react";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";

// ── useWorkspace hook ─────────────────────────────────────────
// Provides workspace data and actions to any client component.
// Must be used inside <WorkspaceProvider>.

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  }
  return ctx;
}
