import { ExternalLink, User } from "lucide-react";
import Image from "next/image";

import { GithubIcon } from "@/components/github-icon";
import coverSizes from "@/lib/cover-sizes.json";
// Deterministic pick per project (stable across renders/reloads), not
// Math.random(): cycles through the site's secondary accent palette.
const COVER_BACKGROUNDS = ["bg-accent-1/20", "bg-accent-2/30", "bg-accent-3/20", "bg-accent-4/40", "bg-accent-5/40"];

// Two-stop gradients built from the same accent palette, for projects with
// no cover image yet: keeps the "no image" state visually consistent with
// the tinted backgrounds used behind real screenshots.
const NO_IMAGE_GRADIENTS = [
  "bg-gradient-to-br from-accent-1/40 to-accent-4/50",
  "bg-gradient-to-br from-accent-3/40 to-accent-5/50",
  "bg-gradient-to-br from-accent-4/50 to-accent-2/50",
  "bg-gradient-to-br from-accent-2/60 to-accent-1/30",
  "bg-gradient-to-br from-accent-5/50 to-accent-3/40",
];

function pickFor<T>(seed: string, options: T[]) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

const PLACEHOLDER_PREFIX = "data:image/svg+xml";

// The card's image area is 16:10. A cover close to that shape fills it edge to
// edge; anything else (phone screenshots, square illustrations, very wide
// banners) stays whole inside a padded frame, because filling would crop it.
const CARD_RATIO = 16 / 10;
const SIZES: Record<string, number[]> = coverSizes;

function fillsCard(url: string) {
  const size = SIZES[url];
  if (!size) return false;
  const ratio = size[0] / size[1] / CARD_RATIO;
  return ratio > 0.9 && ratio < 1.12;
}

export function ProjectCoverImage({
  id,
  coverImageUrl,
  title,
  year,
  yearRange,
  years,
  category,
  liveUrl,
  repoUrl,
}: {
  id: string;
  coverImageUrl: string | null;
  title: string;
  year: number | null;
  yearRange?: string | null;
  years?: number[];
  category?: "commercial" | "personal";
  liveUrl?: string | null;
  repoUrl?: string | null;
}) {
  const yearChips = years && years.length > 0 ? years : null;
  const yearLabel = !yearChips ? yearRange || year : null;
  const isPlaceholder = coverImageUrl?.startsWith(PLACEHOLDER_PREFIX) ?? false;
  const fullBleed = !!coverImageUrl && !isPlaceholder && fillsCard(coverImageUrl);

  return (
    <div
      className={`relative flex aspect-16/10 shrink-0 items-center justify-center overflow-hidden border-b-2 border-border ${
        !coverImageUrl
          ? pickFor(id, NO_IMAGE_GRADIENTS)
          : isPlaceholder
            ? ""
            : pickFor(id, COVER_BACKGROUNDS)
      }`}
    >
      {coverImageUrl && isPlaceholder && (
        // Inline SVG data URI: Next's optimizer can't process these, and
        // there's nothing to gain from optimizing a tiny gradient anyway.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImageUrl} alt={title} className="h-full w-full object-cover" />
      )}
      {coverImageUrl && fullBleed && (
        <Image
          src={coverImageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      )}
      {coverImageUrl && !isPlaceholder && !fullBleed && (
        <div className="relative h-[82%] w-[90%]">
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
          />
        </div>
      )}
      {yearChips && (
        <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {yearChips.map((y) => (
            <span
              key={y}
              className="rounded-lg border-2 border-border bg-card px-2.5 py-0.5 text-xs font-bold shadow-brutal-sm"
            >
              {y}
            </span>
          ))}
        </span>
      )}
      {yearLabel && (
        <span className="absolute top-3 left-3 rounded-lg border-2 border-border bg-card px-2.5 py-0.5 text-xs font-bold shadow-brutal-sm">
          {yearLabel}
        </span>
      )}
      <span className="absolute top-3 right-3 flex items-center gap-1.5">
        {repoUrl && (
          <span className="group relative flex size-7 items-center justify-center rounded-lg border-2 border-border bg-card shadow-brutal-sm">
            <GithubIcon className="size-3.5" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 mt-1.5 whitespace-nowrap rounded-lg border-2 border-border bg-card px-2 py-1 text-xs font-bold opacity-0 shadow-brutal-sm group-hover:opacity-100"
            >
              Open source
            </span>
          </span>
        )}
        {liveUrl && (
          <span className="group relative flex size-7 items-center justify-center rounded-lg border-2 border-border bg-card shadow-brutal-sm">
            <ExternalLink className="size-3.5" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 mt-1.5 whitespace-nowrap rounded-lg border-2 border-border bg-card px-2 py-1 text-xs font-bold opacity-0 shadow-brutal-sm group-hover:opacity-100"
            >
              Live site
            </span>
          </span>
        )}
        {category === "personal" && (
          <span className="group relative flex size-7 items-center justify-center rounded-lg border-2 border-border bg-card shadow-brutal-sm">
            <User className="size-3.5" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 mt-1.5 whitespace-nowrap rounded-lg border-2 border-border bg-card px-2 py-1 text-xs font-bold opacity-0 shadow-brutal-sm group-hover:opacity-100"
            >
              Personal project
            </span>
          </span>
        )}
      </span>
    </div>
  );
}
