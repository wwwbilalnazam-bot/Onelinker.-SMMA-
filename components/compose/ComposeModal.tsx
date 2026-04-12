"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Enterprise-grade modal component for compose
 * Prevents flicker and re-renders using proper React patterns
 */
export const ComposeModal = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  // Memoized close handler
  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Memoized backdrop click handler
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    // Add listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 md:bg-black/40 md:backdrop-blur-sm md:flex md:items-center md:justify-center md:p-4 bg-background"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full h-full md:w-full md:h-auto md:max-w-6xl md:max-h-[90vh] bg-background md:rounded-2xl md:shadow-2xl md:border md:border-border/50 overflow-y-auto md:animate-in md:fade-in-0 md:zoom-in-95 md:duration-300 flex flex-col">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
          title="Close (Esc)"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-5">
          {children}
        </div>
      </div>
    </div>
  );
};
