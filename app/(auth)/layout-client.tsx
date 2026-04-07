"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Calendar, BarChart3, Users, Shield, Star, ArrowLeft,
  Sparkles, Globe, Zap,
  Twitter, Instagram, Linkedin, Youtube, Facebook,
} from "lucide-react";
import { ForceLightTheme } from "@/components/providers/ForceLightTheme";

/* ── Testimonials ──────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    quote: "Onelinker cut our posting time by 80%. We manage 12 brands from one dashboard now.",
    name: "Sarah Chen",
    role: "Social Media Manager",
    company: "CreativeFlow Agency",
    avatarBg: "bg-gradient-to-br from-pink-400 to-rose-600",
  },
  {
    quote: "The AI captions are surprisingly good. It's like having an extra team member who never sleeps.",
    name: "Marcus Johnson",
    role: "Content Creator",
    company: "50K+ followers",
    avatarBg: "bg-gradient-to-br from-violet-400 to-indigo-600",
  },
  {
    quote: "Best scheduling tool for the price. The free tier alone is more generous than competitors' paid plans.",
    name: "Priya Sharma",
    role: "Founder",
    company: "GrowthLab Digital",
    avatarBg: "bg-gradient-to-br from-emerald-400 to-teal-600",
  },
];

const HIGHLIGHTS = [
  { icon: Globe, text: "10+ platforms", color: "text-sky-400", bg: "bg-sky-500/10" },
  { icon: Sparkles, text: "AI content creation", color: "text-violet-400", bg: "bg-violet-500/10" },
  { icon: Calendar, text: "Smart scheduling", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: BarChart3, text: "Deep analytics", color: "text-amber-400", bg: "bg-amber-500/10" },
];

/* ── Floating Platform Icons ───────────────────────────────── */

function FloatingIcons() {
  const icons = [
    { Icon: Twitter, color: "text-sky-400/20", style: { top: "12%", left: "8%" }, delay: "0s", size: "h-5 w-5" },
    { Icon: Instagram, color: "text-pink-400/20", style: { top: "25%", right: "12%" }, delay: "1s", size: "h-6 w-6" },
    { Icon: Linkedin, color: "text-blue-400/20", style: { bottom: "35%", left: "15%" }, delay: "2s", size: "h-4 w-4" },
    { Icon: Youtube, color: "text-red-400/15", style: { top: "45%", right: "20%" }, delay: "0.5s", size: "h-5 w-5" },
    { Icon: Facebook, color: "text-blue-300/15", style: { bottom: "20%", right: "8%" }, delay: "1.5s", size: "h-4 w-4" },
  ];

  return (
    <>
      {icons.map((item, i) => (
        <div
          key={i}
          className="absolute animate-float pointer-events-none"
          style={{
            ...item.style,
            animationDelay: item.delay,
            animationDuration: "4s",
          }}
        >
          <item.Icon className={cn(item.size, item.color)} />
        </div>
      ))}
    </>
  );
}

/* ── Rotating Testimonial ──────────────────────────────────── */

function RotatingTestimonial() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const testimonial = TESTIMONIALS[index]!;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-5 backdrop-blur-sm transition-all duration-500">
        <div className="flex gap-0.5 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-sm text-white/80 leading-relaxed italic min-h-[3rem] transition-all duration-500">
          &ldquo;{testimonial.quote}&rdquo;
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg",
            testimonial.avatarBg,
          )}>
            {testimonial.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{testimonial.name}</p>
            <p className="text-[11px] text-white/40">
              {testimonial.role} &middot; {testimonial.company}
            </p>
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-white/50" : "w-1.5 bg-white/15 hover:bg-white/25"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Layout ────────────────────────────────────────────────── */

export function AuthLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <ForceLightTheme />

      {/* ── Left panel (branding) — hidden on mobile ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0f0a2e] to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,92,255,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating platform icons */}
        <FloatingIcons />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/logo.png" alt="Onelinker" width={36} height={36} className="rounded-xl shadow-lg transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold text-white tracking-tight">Onelinker</span>
          </Link>

          {/* Middle — headline + highlights */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl xl:text-3xl font-extrabold text-white leading-tight tracking-tight">
                Schedule smarter.
                <br />
                <span className="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
                  Grow faster.
                </span>
              </h2>
              <p className="text-sm text-white/50 mt-3 max-w-sm leading-relaxed">
                Join thousands of creators and agencies managing their social media from one powerful dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.text}
                  className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-3 hover:bg-white/[0.06] transition-colors"
                >
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", h.bg)}>
                    <h.icon className={cn("h-3.5 w-3.5", h.color)} />
                  </div>
                  <span className="text-xs text-white/70 font-medium">{h.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — testimonial + trust badges */}
          <div className="space-y-6">
            <RotatingTestimonial />

            {/* Trust badges */}
            <div className="flex items-center gap-4 text-[11px] text-white/30">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> SOC 2 Compliant
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> 99.9% Uptime
              </span>
              <span className="h-3 w-px bg-white/10" />
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3" /> 5,000+ Creators
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel (form area) ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-border/30">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="Onelinker" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold text-foreground tracking-tight">Onelinker</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </header>

        {/* Desktop top-right nav */}
        <div className="hidden lg:flex items-center justify-end px-8 py-5">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Form content — centered */}
        <main className="flex-1 flex items-center justify-center px-5 py-8 lg:py-0">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-5 pb-5 pt-2 text-center text-xs text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="mt-1 text-muted-foreground/60">&copy; 2026 Onelinker.ai</p>
        </footer>
      </div>
    </div>
  );
}
