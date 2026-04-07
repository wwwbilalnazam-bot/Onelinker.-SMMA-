"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

/**
 * Modal wrapper for the compose page
 * Used when accessed via /create?sheet=true
 * Displays the compose content in a Buffer-like modal overlay
 */
export function ComposeSheet() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if this should be displayed as a sheet/modal
    const isSheet = searchParams.get("sheet") === "true";
    setIsOpen(isSheet);
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  // Close modal when clicking outside (on the backdrop)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-background rounded-2xl shadow-2xl border border-border/60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300 flex flex-col">
        {/* Close button - positioned absolutely */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content will be rendered below this by the create page */}
      </div>
    </div>
  );
}
