"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PLACEHOLDER_PREFIX = "data:image/svg+xml";

export function LightboxImage({
  src,
  alt,
  padded,
}: {
  src: string;
  alt: string;
  padded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isPlaceholder = src.startsWith(PLACEHOLDER_PREFIX);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex max-w-full cursor-zoom-in items-center justify-center ${padded ? "bg-card p-4" : ""}`}
      >
        <Image
          src={src}
          alt={alt}
          width={640}
          height={400}
          className="h-auto max-h-[70vh] w-auto max-w-full object-contain"
          unoptimized={isPlaceholder}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute top-5 right-5 flex size-10 items-center justify-center rounded-lg border-2 border-border bg-card text-xl font-black shadow-brutal-sm"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] cursor-zoom-out rounded-lg border-2 border-border object-contain shadow-brutal"
          />
        </div>
      )}
    </>
  );
}
