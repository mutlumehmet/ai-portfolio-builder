import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/config";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon generated from the initials and primary colour in site.config.ts.
export default function Icon() {
  const { theme, person } = siteConfig;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.primary,
          color: theme.primaryForeground,
          border: "5px solid #000",
          borderRadius: 10,
          fontSize: 30,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        {person.initials}
      </div>
    ),
    { ...size }
  );
}
