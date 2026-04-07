"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu, X, ChevronRight, Twitter, Linkedin, Instagram, Youtube,
  Facebook, ArrowUpRight, Mail, ArrowRight, Globe, Sparkles, Shield,
} from "lucide-react";
import { ForceLightTheme } from "@/components/providers/ForceLightTheme";

/* ── Navigation ─────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "How it Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
] as const;

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo.png" alt="Onelinker" width={32} height={32} className="rounded-lg shadow-glow-sm transition-transform group-hover:scale-105" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            Onelinker
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-glow-sm hover:shadow-glow"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-foreground"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/40 px-5 pb-6 pt-2 space-y-4 animate-fade-in">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "How it Works", href: "/how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Quick Start", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
] as const;

const SOCIALS = [
  { icon: Twitter, href: "#", label: "X (Twitter)" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Facebook, href: "#", label: "Facebook" },
] as const;

function Footer() {
  return (
    <footer className="relative overflow-hidden">
      {/* CTA banner */}
      <div className="border-t border-border/30 bg-muted/10">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-8 sm:p-10 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-primary/8 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  Ready to grow your social presence?
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Join thousands of creators and agencies scheduling smarter. Free forever, no credit card required.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-glow-sm hover:shadow-glow"
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="border-t border-border/30 bg-background">
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4 group">
                <Image src="/logo.png" alt="Onelinker" width={32} height={32} className="rounded-lg shadow-glow-sm transition-transform group-hover:scale-105" />
                <span className="text-lg font-bold text-foreground tracking-tight">
                  Onelinker
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
                The AI-powered social media scheduling platform. Schedule across 10+ channels, create with AI, and grow your audience — all in one place.
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-1.5">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-all duration-200"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-4">
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group/link"
                      >
                        {l.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 -translate-y-0.5 group-hover/link:opacity-50 group-hover/link:translate-y-0 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Highlights strip */}
          <div className="mt-10 pt-8 border-t border-border/30">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-8">
              {[
                { icon: Globe, text: "10+ platforms supported" },
                { icon: Sparkles, text: "AI-powered content" },
                { icon: Shield, text: "SOC 2 compliant" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center gap-4 pt-6 border-t border-border/20 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground/50">
              &copy; {new Date().getFullYear()} Onelinker. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/privacy" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                Terms
              </Link>
              <a href="mailto:support@onelinker.ai" className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Mail className="h-3 w-3" />
                support@onelinker.ai
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Layout ─────────────────────────────────────────────────── */

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ForceLightTheme />
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
