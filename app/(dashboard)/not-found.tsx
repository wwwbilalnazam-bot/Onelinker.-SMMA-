"use client";

import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center mb-6">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We couldn&apos;t find the post or page you&apos;re looking for.
        Make sure the URL is correct or try searching for it.
      </p>
      <Link href="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
