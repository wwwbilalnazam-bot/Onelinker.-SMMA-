"use client";

import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Zap, Globe, Sparkles,
  Shield, Users, Heart, Target, Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSection, StaggerChildren } from "@/components/ui/animated-section";

const VALUES = [
  {
    icon: Heart,
    title: "Creator-first",
    description: "Every feature is designed with creators in mind. We build tools that save you time and help you grow.",
  },
  {
    icon: Shield,
    title: "Privacy & trust",
    description: "We never store your social media passwords. OAuth-only connections, encrypted data, transparent practices.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    description: "AI-powered content, smart scheduling, and continuous improvement. We ship new features every month.",
  },
  {
    icon: Globe,
    title: "Accessibility",
    description: "A generous free tier so everyone can schedule smarter. No paywalls on core functionality.",
  },
] as const;

const STATS = [
  { value: "10+", label: "Platforms supported" },
  { value: "5,000+", label: "Active creators" },
  { value: "50K+", label: "Posts scheduled" },
  { value: "99.9%", label: "Uptime" },
] as const;

const TIMELINE = [
  { year: "2025", title: "Onelinker founded", description: "Started as a side project to solve our own social media scheduling pain." },
  { year: "2025", title: "Public launch", description: "Launched with support for X, Instagram, Facebook, and LinkedIn." },
  { year: "2026", title: "10+ platforms", description: "Added TikTok, YouTube, Pinterest, Threads, Bluesky, Telegram, and Google Business." },
  { year: "2026", title: "AI-powered features", description: "Launched AI caption generation, hashtag suggestions, and content recommendations." },
  { year: "2026", title: "Agency tools", description: "Multi-brand workspaces, team collaboration, approval workflows, and white-label support." },
] as const;

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/6 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-16 sm:pt-24 pb-12">
          <AnimatedSection animation="fade-up" delay={100}>
          <div className="text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              About Us
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight max-w-3xl mx-auto">
              We&apos;re building the{" "}
              <span className="bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
                best way to manage
              </span>{" "}
              social media
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-2xl mx-auto leading-relaxed">
              Onelinker was born from a simple frustration: managing multiple social platforms
              shouldn&apos;t require 5 tabs, 3 apps, and half your day. We&apos;re fixing that.
            </p>
          </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <StaggerChildren animation="scale" staggerMs={100} className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center">
              <p className="text-3xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </StaggerChildren>
      </section>

      {/* Mission */}
      <section className="bg-muted/10 border-y border-border/30">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Our Mission
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                Make social media management simple, powerful, and affordable for everyone
              </h2>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                We believe every creator, small business, and agency deserves professional-grade
                social media tools — without the enterprise price tag. Onelinker combines the power
                of AI with an intuitive interface to help you create better content, publish it at
                the perfect time, and understand what resonates with your audience.
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Our free tier isn&apos;t a limited trial — it&apos;s a real, usable product with 10 accounts,
                50 posts per month, and access to all platforms. We grow when you grow.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Target, text: "Support 10+ social platforms from a single dashboard" },
                { icon: Sparkles, text: "AI that writes captions and suggests the best times to post" },
                { icon: Users, text: "Team collaboration with workspaces and approval workflows" },
                { icon: Rocket, text: "Ship new features and integrations every month" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/60 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 shrink-0">
                    <item.icon className="h-4 w-4 text-foreground" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Our Values
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            What drives us every day
          </h2>
        </div>

        <StaggerChildren animation="fade-up" staggerMs={100} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-border/50 bg-card/60 p-6 hover:border-border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 mb-4">
                <v.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1.5">{v.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{v.description}</p>
            </div>
          ))}
        </StaggerChildren>
      </section>

      {/* Timeline */}
      <section className="bg-muted/10 border-y border-border/30">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Our Journey
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              How we got here
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/40" />

            <div className="space-y-8">
              {TIMELINE.map((item, i) => (
                <AnimatedSection key={i} animation="fade-up" delay={i * 100}>
                <div className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 shrink-0 z-10",
                      i === TIMELINE.length - 1
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-card"
                    )}>
                      <div className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        i === TIMELINE.length - 1 ? "bg-primary" : "bg-muted-foreground/40"
                      )} />
                    </div>
                  </div>
                  <div className="pb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {item.year}
                    </span>
                    <h3 className="text-base font-semibold text-foreground mt-0.5">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/6 rounded-full blur-[100px]" />
        </div>

        <AnimatedSection animation="scale" className="relative max-w-3xl mx-auto px-5 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Join us on the journey
          </h2>
          <p className="text-base text-muted-foreground mt-3 max-w-lg mx-auto">
            Try Onelinker free and see why thousands of creators trust us with their social media.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-glow-sm hover:shadow-glow mt-8"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </AnimatedSection>
      </section>
    </div>
  );
}
