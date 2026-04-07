import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

// ── Tailwind class merging ────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date formatting ───────────────────────────────────────────
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatScheduledDate(date: string | Date | null): string {
  if (!date) return "Not scheduled";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

// ── Number formatting ─────────────────────────────────────────
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// ── String utilities ──────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── URL utilities ─────────────────────────────────────────────
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://onelinker.ai";
  return `${base}${path}`;
}

export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// ── Array utilities ───────────────────────────────────────────
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const group = String(item[key]);
      if (!acc[group]) acc[group] = [];
      acc[group]!.push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

export function sortBy<T>(arr: T[], key: keyof T, dir: "asc" | "desc" = "asc"): T[] {
  return [...arr].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Async utilities ───────────────────────────────────────────
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: Error | unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await sleep(delayMs * Math.pow(2, i));
    }
  }
  throw lastError;
}

// ── Environment ───────────────────────────────────────────────
export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

// ── Platform color helper ─────────────────────────────────────
import { Platform } from "@/types";

export const PLATFORM_COLORS: Record<Platform, string> = {
  [Platform.Twitter]:        "#1DA1F2",
  [Platform.LinkedIn]:       "#0A66C2",
  [Platform.Instagram]:      "#E1306C",
  [Platform.TikTok]:         "#010101",
  [Platform.Facebook]:       "#1877F2",
  [Platform.Threads]:        "#000000",
  [Platform.Bluesky]:        "#0085FF",
  [Platform.YouTube]:        "#FF0000",
  [Platform.Pinterest]:      "#E60023",
  [Platform.GoogleBusiness]: "#4285F4",
};

export const PLATFORM_NAMES: Record<Platform, string> = {
  [Platform.Twitter]:        "X (Twitter)",
  [Platform.LinkedIn]:       "LinkedIn",
  [Platform.Instagram]:      "Instagram",
  [Platform.TikTok]:         "TikTok",
  [Platform.Facebook]:       "Facebook",
  [Platform.Threads]:        "Threads",
  [Platform.Bluesky]:        "Bluesky",
  [Platform.YouTube]:        "YouTube",
  [Platform.Pinterest]:      "Pinterest",
  [Platform.GoogleBusiness]: "Google Business",
};

// ── Copy to clipboard ─────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand("copy");
    document.body.removeChild(el);
    return success;
  }
}

// ── Debounce ──────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
