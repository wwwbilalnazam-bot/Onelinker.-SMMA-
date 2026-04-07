import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Onelinker brand colors
        brand: {
          purple: "#7C5CFF",
          coral: "#FF5757",
          teal: "#00C49A",
        },
        // Semantic tokens mapped to CSS vars (set in globals.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Platform colors
        platform: {
          twitter:  "#1DA1F2",
          linkedin: "#0A66C2",
          instagram:"#E1306C",
          tiktok:   "#69C9D0",   // teal accent (not black — unusable on dark bg)
          facebook: "#1877F2",
          threads:  "#A8A8A8",   // light gray (original black unusable on dark)
          bluesky:  "#0085FF",
          youtube:  "#FF0000",
          pinterest:"#E60023",
          google:   "#4285F4",
        },
        // Status colors
        status: {
          draft: "#8888AA",
          scheduled: "#6C47FF",
          published: "#00D4AA",
          failed: "#FF6B6B",
          pending: "#F59E0B",
          cancelled: "#6B7280",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        heading: ["var(--font-heading)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(8px)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulse_ring: {
          "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(124, 92, 255, 0.7)" },
          "70%": { transform: "scale(1)", boxShadow: "0 0 0 10px rgba(124, 92, 255, 0)" },
          "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(124, 92, 255, 0)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        pulse_ring: "pulse_ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
        "count-up": "count-up 0.5s ease-out",
        marquee: "marquee 30s linear infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "brand-gradient": "linear-gradient(135deg, #7C5CFF 0%, #FF5757 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(124, 92, 255, 0.15) 0%, rgba(255, 87, 87, 0.15) 100%)",
        "surface-gradient": "linear-gradient(180deg, #0E0E18 0%, #08080F 100%)",
        shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
      },
      boxShadow: {
        /* Glow — primary purple */
        glow:    "0 0 0 1px hsl(258 88% 50% / 0.5), 0 0 24px hsl(258 88% 62% / 0.35)",
        "glow-sm": "0 0 0 1px hsl(258 88% 50% / 0.4), 0 0 12px hsl(258 88% 62% / 0.25)",
        "glow-lg": "0 0 0 1px hsl(258 88% 50% / 0.5), 0 0 48px hsl(258 88% 62% / 0.45)",
        /* Elevation levels */
        "xs":   "0 1px 2px rgba(0,0,0,0.12)",
        "sm":   "0 1px 3px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.1)",
        "md":   "0 4px 12px rgba(0,0,0,0.2),  0 2px 4px rgba(0,0,0,0.12)",
        "lg":   "0 8px 24px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.12)",
        "xl":   "0 16px 40px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.12)",
        /* Cards */
        card:       "0 1px 3px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)",
        "card-hover": "0 6px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
        /* Dropdowns / popovers */
        dropdown: "0 8px 32px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.16), 0 0 0 1px rgba(255,255,255,0.04)",
        /* Inner highlight for buttons */
        "inner-highlight": "inset 0 1px 0 rgba(255,255,255,0.15)",
      },
      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
