import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.seo.title;

// Share image built from site.config.ts: initials mark, headline and tagline.
export default function Image() {
  const { theme, person, hero, seo } = siteConfig;
  const ink = theme.foreground;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: theme.background,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 160,
            height: 160,
            borderRadius: 16,
            border: `4px solid ${ink}`,
            boxShadow: `10px 10px 0 ${ink}`,
            background: theme.primary,
            color: theme.primaryForeground,
            fontSize: 72,
            fontWeight: 900,
            transform: "rotate(-3deg)",
          }}
        >
          {person.initials}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 48,
            fontSize: 52,
            fontWeight: 900,
            color: ink,
          }}
        >
          {hero.headlineBefore}
          <span
            style={{
              display: "flex",
              marginLeft: 16,
              padding: "0 14px",
              borderRadius: 8,
              border: "3px solid #000",
              background: theme.secondary,
              color: theme.secondaryForeground,
              transform: "rotate(-1deg)",
              boxShadow: "4px 4px 0 #000",
            }}
          >
            {hero.headlineHighlight}
          </span>
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: theme.mutedForeground }}>
          {person.name} · {seo.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
