"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Zap, ArrowRight, CheckCircle2, Star, ChevronDown,
  Calendar, BarChart3, Sparkles, Users, Shield, Smartphone,
  Twitter, Linkedin, Instagram, Youtube, Facebook,
  Clock, Layers, Globe, PenTool, TrendingUp, Eye,
  Image as ImageIcon, Send, MoreHorizontal, Heart, MessageCircle,
  Repeat2, Bookmark, Play, Hash, AtSign, Bell,
} from "lucide-react";
import { useState } from "react";
import { AnimatedSection, StaggerChildren } from "@/components/ui/animated-section";

/* ─── Platform icons ───────────────────────────────────────── */

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.29 3.276-1.06 1.316-2.572 2.013-4.5 2.072h-.031c-1.604-.05-2.907-.58-3.874-1.574-1.08-1.11-1.636-2.66-1.654-4.612l.003-.078c.072-2.027.734-3.573 1.97-4.6 1.148-.954 2.69-1.457 4.459-1.457l.14.001c1.845.03 3.386.608 4.58 1.716.554.515.994 1.118 1.322 1.8.352-.18.675-.38.968-.6l.257-.198 1.074 1.69-.264.204c-.554.427-1.167.784-1.828 1.065.088.376.148.763.178 1.16.076 1.002-.07 2.026-.434 3.048-.707 1.984-2.1 3.386-4.038 4.064-1.124.393-2.394.567-3.794.567l-.136-.001zm-.12-9.505c-.12 0-.238.004-.355.011-1.168.068-2.083.466-2.722 1.182-.632.71-.978 1.716-1.028 2.994.02 1.46.395 2.56 1.114 3.27.627.617 1.497.956 2.588.987h.018c1.352-.04 2.376-.489 3.043-1.336.55-.697.932-1.69 1.098-2.862-.592-.232-1.236-.385-1.932-.46a8.737 8.737 0 0 0-.961-.053c-.333 0-.662.025-.986.074l-.326-2.02c.44-.072.889-.108 1.337-.108.602 0 1.178.056 1.725.167-.077-.278-.185-.543-.323-.794-.72-1.312-2.07-1.997-3.892-2.04l-.398-.012z"/>
    </svg>
  );
}

function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.601 3.497 6.225 3.165-.363.113-.72.26-1.08.42-2.614 1.18-2.083 3.5-.505 4.782 2.997 2.434 5.504.717 6.736-1.614.156-.296.3-.602.414-.872.115.27.258.576.414.872 1.232 2.331 3.739 4.048 6.736 1.614 1.578-1.282 2.109-3.602-.504-4.782a6.42 6.42 0 0 0-1.081-.42c2.624.332 5.44-.538 6.225-3.165C24.455 9.418 24.833 4.458 24.833 3.768c0-.69-.139-1.86-.902-2.203-.66-.299-1.664-.621-4.3 1.24C16.879 4.747 13.92 8.686 12.833 10.8h-.833z"/>
    </svg>
  );
}

const PLATFORMS = [
  { name: "X (Twitter)", icon: Twitter, color: "text-sky-400" },
  { name: "Instagram", icon: Instagram, color: "text-pink-400" },
  { name: "Facebook", icon: Facebook, color: "text-blue-400" },
  { name: "LinkedIn", icon: Linkedin, color: "text-blue-500" },
  { name: "YouTube", icon: Youtube, color: "text-red-400" },
  { name: "TikTok", icon: TikTokIcon, color: "text-teal-400" },
  { name: "Pinterest", icon: PinterestIcon, color: "text-rose-400" },
  { name: "Threads", icon: ThreadsIcon, color: "text-zinc-400" },
  { name: "Bluesky", icon: BlueskyIcon, color: "text-blue-400" },
] as const;

/* ─── Features ──────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Globe,
    title: "10+ Platforms, One Dashboard",
    description:
      "Manage X, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Threads, Bluesky, and Google Business — all from a single interface.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling & Publishing",
    description:
      "Schedule posts with images, videos, stories, and carousels. Set recurring schedules and let Onelinker publish automatically.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Content Creation",
    description:
      "Generate captions, hashtags, and content ideas with built-in AI. Write better posts in seconds, not hours.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Layers,
    title: "Visual Planning & Collaboration",
    description:
      "Multi-brand workspaces, drag-and-drop content calendar, shared asset library, and team approval workflows.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics & Insights",
    description:
      "Track engagement, reach, and growth across every platform. Exportable reports and performance comparisons.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
  {
    icon: Shield,
    title: "Built for Comfort & Growth",
    description:
      "Dark mode, mobile-optimized, regular updates, and bank-grade security. Start free and scale to agency-level.",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
  },
] as const;

/* ─── Stats ─────────────────────────────────────────────────── */

const STATS = [
  { value: "10+", label: "Platforms supported", icon: Globe },
  { value: "50K+", label: "Posts scheduled", icon: Send },
  { value: "5,000+", label: "Happy creators", icon: Users },
  { value: "99.9%", label: "Uptime reliability", icon: Shield },
] as const;

/* ─── Testimonials ─────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Content Creator",
    followers: "125K followers",
    avatar: "SC",
    avatarBg: "bg-pink-500",
    quote: "Onelinker replaced 4 different tools for me. I schedule to Instagram, TikTok, LinkedIn, and YouTube all at once. Saves me at least 8 hours a week.",
    platform: Twitter,
    platformColor: "text-sky-400",
  },
  {
    name: "Marcus Williams",
    role: "Marketing Agency Owner",
    followers: "32 clients",
    avatar: "MW",
    avatarBg: "bg-violet-500",
    quote: "Managing social for 32 clients used to be chaos. With Onelinker's workspaces and approval flows, my team runs like clockwork. The AI captions are surprisingly good too.",
    platform: Linkedin,
    platformColor: "text-blue-500",
  },
  {
    name: "Priya Patel",
    role: "E-commerce Brand",
    followers: "85K followers",
    avatar: "PP",
    avatarBg: "bg-emerald-500",
    quote: "The analytics alone are worth it. I finally know which posts drive actual sales vs just likes. Our engagement went up 40% in the first month.",
    platform: Instagram,
    platformColor: "text-pink-400",
  },
] as const;

/* ─── FAQ ───────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "Is there a free plan?",
    a: "Yes! Our free plan includes 10 social accounts, 50 posts per month, and access to all supported platforms. No credit card required.",
  },
  {
    q: "Which social platforms are supported?",
    a: "We support X (Twitter), Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Threads, Bluesky, Telegram, and Google Business Profile — with more coming soon.",
  },
  {
    q: "Can I schedule posts with images and videos?",
    a: "Absolutely. You can schedule posts with images, videos, carousels, stories, and reels depending on the platform.",
  },
  {
    q: "How does the AI content creation work?",
    a: "Our AI generates captions, hashtags, and content suggestions based on your brand voice. Just describe what you want and the AI writes it for you.",
  },
  {
    q: "Can I collaborate with my team?",
    a: "Yes. Pro and Agency plans support team members with role-based permissions, approval workflows, and shared workspaces.",
  },
  {
    q: "How is this different from Buffer or Hootsuite?",
    a: "Onelinker offers more platforms, AI-powered content, and better pricing. Our free tier is more generous, and our Agency plan costs a fraction of competitors.",
  },
] as const;

/* ─── FAQ Accordion Item ────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left gap-4"
      >
        <span className="text-sm font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-40 pb-5" : "max-h-0"
        )}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Marquee for platforms ─────────────────────────────────── */

function PlatformMarquee() {
  const doubled = [...PLATFORMS, ...PLATFORMS];
  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex animate-marquee gap-8 sm:gap-12">
        {doubled.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className="flex items-center gap-2.5 shrink-0 px-4 py-2.5 rounded-xl border border-border/30 bg-card/40 hover:bg-card/70 hover:border-border/60 transition-all duration-200"
          >
            <p.icon className={cn("h-5 w-5", p.color)} />
            <span className="text-sm font-medium text-foreground/70 whitespace-nowrap">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Realistic Dashboard Mockup ───────────────────────────── */

function DashboardMockup() {
  const scheduledPosts = [
    {
      platform: Twitter,
      platformColor: "text-sky-400",
      platformBg: "bg-sky-500/10",
      text: "Excited to announce our new feature launch! Check out what we've been building...",
      time: "Today, 2:30 PM",
      status: "Scheduled",
      statusColor: "text-violet-400 bg-violet-500/10",
      engagement: "1.2K",
    },
    {
      platform: Instagram,
      platformColor: "text-pink-400",
      platformBg: "bg-pink-500/10",
      text: "Behind the scenes of our latest photoshoot. New collection dropping Friday!",
      time: "Today, 5:00 PM",
      status: "Scheduled",
      statusColor: "text-violet-400 bg-violet-500/10",
      engagement: "3.4K",
    },
    {
      platform: Linkedin,
      platformColor: "text-blue-500",
      platformBg: "bg-blue-500/10",
      text: "5 lessons I learned scaling our startup to 10K users in 30 days...",
      time: "Tomorrow, 9:00 AM",
      status: "Draft",
      statusColor: "text-zinc-400 bg-zinc-500/10",
      engagement: "890",
    },
  ];

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/60">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-amber-500/60" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded-md bg-muted/40 px-12 py-1 text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            app.onelinker.ai
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-muted/30 flex items-center justify-center">
            <Bell className="h-3 w-3 text-muted-foreground/50" />
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-4 sm:p-6 space-y-4 bg-gradient-to-b from-card/80 to-background/40">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Content Calendar</p>
              <p className="text-[11px] text-muted-foreground">April 2026</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 px-3 rounded-lg bg-muted/40 flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <Eye className="h-3 w-3" /> Week
            </div>
            <div className="h-8 px-3 rounded-lg bg-primary/20 text-primary flex items-center gap-1.5 text-[11px] font-semibold">
              <PenTool className="h-3 w-3" /> New Post
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Scheduled", value: "24", change: "+3 today", color: "text-violet-400", icon: Clock },
            { label: "Published", value: "156", change: "this month", color: "text-emerald-400", icon: CheckCircle2 },
            { label: "Engagement", value: "12.4K", change: "+18.2%", color: "text-pink-400", icon: Heart },
            { label: "Growth", value: "+842", change: "followers", color: "text-sky-400", icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <stat.icon className={cn("h-3 w-3", stat.color)} />
                <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
              </div>
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-emerald-400 font-medium mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Scheduled posts list */}
        <div className="hidden sm:block rounded-xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <p className="text-xs font-semibold text-foreground">Upcoming Posts</p>
            <span className="text-[10px] text-muted-foreground">3 of 24 scheduled</span>
          </div>
          <div className="divide-y divide-border/30">
            {scheduledPosts.map((post, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", post.platformBg)}>
                  <post.platform className={cn("h-4 w-4", post.platformColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed line-clamp-1">{post.text}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {post.time}
                    </span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", post.statusColor)}>
                      {post.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Eye className="h-2.5 w-2.5" /> {post.engagement}
                  </div>
                  <button className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground">
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar grid (mobile-hidden, shown on larger screens) */}
        <div className="sm:hidden rounded-xl border border-border/40 bg-card/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">April 2026</p>
            <div className="flex gap-1.5">
              <div className="h-5 w-5 rounded bg-muted/30 flex items-center justify-center text-muted-foreground/60">
                <ChevronDown className="h-3 w-3 rotate-90" />
              </div>
              <div className="h-5 w-5 rounded bg-muted/30 flex items-center justify-center text-muted-foreground/60">
                <ChevronDown className="h-3 w-3 -rotate-90" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={`d-${i}`} className="text-[9px] text-muted-foreground/50 text-center font-medium">{d}</div>
            ))}
            {[...Array(35)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-md flex items-center justify-center text-[9px]",
                  [3, 10, 14, 21, 27].includes(i)
                    ? "bg-primary/15 border border-primary/25 text-primary font-semibold"
                    : [6, 17, 24].includes(i)
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold"
                    : "bg-muted/15 border border-border/20 text-muted-foreground/40"
                )}
              >
                {i + 1 <= 30 ? i + 1 : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Realistic Analytics Mockup ───────────────────────────── */

function AnalyticsMockup() {
  const barHeights = [35, 52, 45, 68, 58, 72, 65, 80, 75, 90, 82, 95, 88, 70, 78, 85, 92, 88, 95, 100, 92, 85, 90, 95];

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4">
      {/* Chart header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Engagement Overview</p>
          <p className="text-xs text-muted-foreground">Last 30 days across all platforms</p>
        </div>
        <div className="flex gap-1.5">
          {["7d", "30d", "90d"].map((range) => (
            <button
              key={range}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                range === "30d"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Platform filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { name: "All", active: true },
          { name: "Twitter", icon: Twitter, color: "text-sky-400" },
          { name: "Instagram", icon: Instagram, color: "text-pink-400" },
          { name: "LinkedIn", icon: Linkedin, color: "text-blue-500" },
        ].map((p) => (
          <div
            key={p.name}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium shrink-0 border transition-colors",
              "active" in p && p.active
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/30 text-muted-foreground hover:border-border/60"
            )}
          >
            {"icon" in p && p.icon && <p.icon className={cn("h-2.5 w-2.5", p.color)} />}
            {p.name}
          </div>
        ))}
      </div>

      {/* Chart area with gradient bars */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-muted-foreground/40 pr-2">
          <span>10K</span>
          <span>5K</span>
          <span>0</span>
        </div>
        {/* Chart bars */}
        <div className="flex items-end gap-[3px] sm:gap-1.5 h-32 sm:h-44 pt-4 pl-7">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t transition-all duration-300 relative group",
                i >= 18 && "hidden sm:block"
              )}
              style={{ height: `${h}%` }}
            >
              <div className="absolute inset-0 rounded-t bg-gradient-to-t from-primary/40 to-primary/15 group-hover:from-primary/60 group-hover:to-primary/30 transition-colors" />
              {/* Tooltip on hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                {Math.round(h * 100)}
              </div>
            </div>
          ))}
        </div>
        {/* X-axis */}
        <div className="flex justify-between pl-7 mt-1.5">
          <span className="text-[9px] text-muted-foreground/40">Mar 3</span>
          <span className="text-[9px] text-muted-foreground/40">Mar 17</span>
          <span className="text-[9px] text-muted-foreground/40">Apr 1</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { label: "Total Reach", value: "124.5K", change: "+12.3%", icon: Eye },
          { label: "Engagement", value: "8.7K", change: "+24.1%", icon: Heart },
          { label: "New Followers", value: "1,203", change: "+8.5%", icon: Users },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/20 p-3 border border-border/20">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className="h-3 w-3 text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] font-medium text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> {s.change}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ════════ HERO ════════ */}
      <AnimatedSection animation="fade-up" delay={100}>
      <section className="relative">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute top-32 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
          <div className="absolute top-48 left-0 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-20 sm:pt-28 pb-16 sm:pb-24">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Now with AI-powered content creation
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Post everywhere.{" "}
            <span className="bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
              Manage it all
            </span>{" "}
            in one place.
          </h1>

          {/* Subheading */}
          <p className="text-center text-base sm:text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            Schedule posts, generate content with AI, track performance, and manage all your
            social channels from a single dashboard. Trusted by 5,000+ creators and agencies.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-glow-sm hover:shadow-glow w-full sm:w-auto justify-center"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-7 py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition-all w-full sm:w-auto justify-center"
            >
              View pricing
            </Link>
          </div>

          {/* Social proof line */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            {/* Avatars */}
            <div className="flex -space-x-2.5">
              {[
                { bg: "bg-gradient-to-br from-sky-400 to-sky-600", letter: "S" },
                { bg: "bg-gradient-to-br from-pink-400 to-pink-600", letter: "M" },
                { bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", letter: "A" },
                { bg: "bg-gradient-to-br from-amber-400 to-amber-600", letter: "J" },
                { bg: "bg-gradient-to-br from-violet-400 to-violet-600", letter: "K" },
              ].map((u, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
                    u.bg
                  )}
                >
                  {u.letter}
                </div>
              ))}
              <div className="h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground bg-muted/60">
                +5K
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">4.9/5</span> from 2,000+ reviews
              </span>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="relative mt-16 sm:mt-20">
            <DashboardMockup />
            {/* Glow behind mockup */}
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ════════ PLATFORM LOGOS (Marquee) ════════ */}
      <AnimatedSection animation="fade-up">
      <section className="border-y border-border/30 bg-muted/5">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            Publish to every major platform
          </p>
          <PlatformMarquee />
        </div>
      </section>
      </AnimatedSection>

      {/* ════════ STATS ════════ */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <StaggerChildren animation="scale" staggerMs={120} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center group">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4 group-hover:bg-primary/10 transition-colors">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl sm:text-4xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </StaggerChildren>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section id="features" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <AnimatedSection animation="fade-up">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Built for creators.{" "}
              <span className="text-muted-foreground">Evolving for the future.</span>
            </h2>
            <p className="text-base text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
              Everything you need to create, schedule, analyze, and grow — across every platform, in one beautiful interface.
            </p>
          </div>
          </AnimatedSection>

          <StaggerChildren animation="fade-up" staggerMs={100} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/50 bg-card/60 p-6 hover:border-border hover:bg-card/80 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl mb-4", f.bg)}>
                  <f.icon className={cn("h-5 w-5", f.color)} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ════════ INSIGHTS SECTION ════════ */}
      <AnimatedSection animation="fade-up">
      <section className="bg-muted/10 border-y border-border/30">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Analytics
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                Insights that empower{" "}
                <span className="text-muted-foreground">every decision</span>
              </h2>
              <p className="text-base text-muted-foreground mt-4 leading-relaxed">
                Stop guessing what works. Our cross-platform analytics show you exactly which
                posts drive engagement, when your audience is active, and how to optimize your content strategy.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Cross-platform performance comparison",
                  "Best time to post recommendations",
                  "Engagement & growth trend reports",
                  "Exportable PDF & CSV reports",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-primary hover:underline"
              >
                Try it free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Analytics mockup */}
            <AnalyticsMockup />
          </div>
        </div>
      </section>
      </AnimatedSection>

      {/* ════════ TESTIMONIALS ════════ */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <AnimatedSection animation="fade-up">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Loved by creators{" "}
            <span className="text-muted-foreground">worldwide</span>
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
            See why thousands of creators, brands, and agencies choose Onelinker.
          </p>
        </div>
        </AnimatedSection>

        <StaggerChildren animation="fade-up" staggerMs={120} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-border/50 bg-card/60 p-6 hover:border-border hover:bg-card/80 transition-all duration-200 flex flex-col"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border/30">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white", t.avatarBg)}>
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role} &middot; {t.followers}</p>
                </div>
                <t.platform className={cn("h-4 w-4 shrink-0", t.platformColor)} />
              </div>
            </div>
          ))}
        </StaggerChildren>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="bg-muted/10 border-y border-border/30">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <AnimatedSection animation="fade-up">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Up and running in minutes
            </h2>
          </div>
          </AnimatedSection>

          <StaggerChildren animation="fade-up" staggerMs={150} className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            {[
              {
                step: "01",
                icon: Users,
                title: "Connect your accounts",
                description: "Link all your social platforms in a few clicks via secure OAuth. No passwords stored.",
                color: "text-sky-400",
                bg: "bg-sky-500/10",
              },
              {
                step: "02",
                icon: PenTool,
                title: "Create & schedule",
                description: "Write posts with AI assistance, add media, and schedule to multiple platforms at once.",
                color: "text-violet-400",
                bg: "bg-violet-500/10",
              },
              {
                step: "03",
                icon: TrendingUp,
                title: "Analyze & grow",
                description: "Track what works, optimize your strategy, and watch your audience grow across every channel.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {/* Connecting arrow (shown between steps on desktop) */}
                {i < 2 && (
                  <div className="hidden sm:block absolute top-7 -right-4 w-8 z-10">
                    <div className="border-t-2 border-dashed border-border/40 w-full" />
                  </div>
                )}
                <div className={cn("inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 mb-5", item.bg)}>
                  <item.icon className={cn("h-6 w-6", item.color)} />
                </div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                  Step {item.step}
                </p>
                <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <AnimatedSection animation="fade-up">
      <section>
        <div className="max-w-3xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 px-6 divide-y divide-border/40">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Still have questions?{" "}
            <Link href="/contact" className="text-primary font-medium hover:underline">
              Get in touch
            </Link>
          </p>
        </div>
      </section>
      </AnimatedSection>

      {/* ════════ FINAL CTA ════════ */}
      <AnimatedSection animation="scale">
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-5 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Ready to take control of{" "}
            <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              your social channels?
            </span>
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed">
            Join thousands of creators and agencies who schedule smarter with Onelinker.
            Free forever — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-glow-sm hover:shadow-glow w-full sm:w-auto justify-center"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-6">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free forever plan
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No credit card
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime
            </span>
          </div>
        </div>
      </section>
      </AnimatedSection>
    </div>
  );
}
