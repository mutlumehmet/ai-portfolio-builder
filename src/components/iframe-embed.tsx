"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function IframeEmbed({
  src,
  title,
  aspectClassName,
}: {
  src: string;
  title: string;
  aspectClassName: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border-2 border-border shadow-brutal",
        aspectClassName
      )}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="size-8 animate-spin rounded-full border-4 border-border border-t-transparent" />
        </div>
      )}
      <iframe
        className="relative h-full w-full"
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        // Embedded pages run in a sandbox: no top-level navigation, no forms,
        // no downloads. Scripts are allowed because video players need them.
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
