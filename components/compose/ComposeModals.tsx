"use client";

import { useRouter, usePathname } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Global modal handler for compose/create page
 * Shows the compose page in a Buffer-like modal when accessed from certain routes
 */
export function ComposeModals() {
  const router = useRouter();
  const pathname = usePathname();

  // Show modal if we're on the create page and not already in a modal
  const isCreatePage = pathname === "/create";
  const isModalView = false; // Can be enhanced with query params if needed

  if (!isCreatePage || isModalView) {
    return null;
  }

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xl" />
  );
}
