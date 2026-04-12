"use client";

import { Navbar, Footer } from "@/components/marketing/nav";
import { ForceLightTheme } from "@/components/providers/ForceLightTheme";

export function MarketingLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ForceLightTheme />
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </div>
    </>
  );
}
