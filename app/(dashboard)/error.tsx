"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We encountered an error while rendering this page.
        {error.message && (
          <code className="block mt-4 p-3 rounded-lg bg-muted text-xs text-left overflow-auto max-h-32">
            {error.message}
          </code>
        )}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
        <Button onClick={() => window.location.href = "/"} variant="default">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
