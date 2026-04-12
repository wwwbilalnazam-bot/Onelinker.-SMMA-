import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Onelinker — Schedule Smarter. Grow Faster.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0A0A0F 0%, #1a0a2e 50%, #0a1628 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px",
        }}
      >
        {/* Main heading */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 600,
            color: "#ffffff",
            marginBottom: "24px",
            textAlign: "center",
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          }}
        >
          Onelinker
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "42px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.8)",
            textAlign: "center",
            maxWidth: "900px",
            marginBottom: "32px",
            lineHeight: "1.4",
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          }}
        >
          Schedule Smarter. Grow Faster.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "#7c3aed",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          AI-powered social media scheduling for creators & agencies
        </div>

        {/* Accent line */}
        <div
          style={{
            width: "80px",
            height: "3px",
            background: "#7c3aed",
            marginTop: "32px",
            borderRadius: "2px",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
