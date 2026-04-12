import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://onelinker.ai"),
  title: {
    default: "Onelinker — Schedule Smarter. Grow Faster.",
    template: "%s | Onelinker",
  },
  description:
    "The AI-powered social media scheduling platform that beats Buffer on price, features, and simplicity. Schedule posts across 10+ platforms, get AI-written captions, and grow your audience.",
  keywords: [
    "social media scheduler",
    "social media management",
    "AI captions",
    "buffer alternative",
    "instagram scheduler",
    "linkedin scheduler",
    "tiktok scheduler",
    "social media analytics",
  ],
  authors: [{ name: "Onelinker", url: "https://onelinker.ai" }],
  creator: "Onelinker",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://onelinker.ai",
    title: "Onelinker — Schedule Smarter. Grow Faster.",
    description:
      "AI-powered social media scheduling for creators and agencies.",
    siteName: "Onelinker",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Onelinker — Social Media Scheduling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Onelinker — Schedule Smarter. Grow Faster.",
    description: "AI-powered social media scheduling for creators and agencies.",
    images: ["/opengraph-image"],
    creator: "@onelinker_ai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0F" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${plusJakartaSans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              },
              success: {
                iconTheme: { primary: "#00C49A", secondary: "#08080F" },
              },
              error: {
                iconTheme: { primary: "#FF5757", secondary: "#08080F" },
              },
            }}
          />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
