// A neutral placeholder mark: the initials from site.config.ts in a tilted,
// brutalist box. Swap this component for your own SVG logo if you have one.
export function Logo({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 -rotate-3 items-center justify-center rounded-md border-2 border-border bg-primary text-[0.7rem] leading-none font-black tracking-tight text-primary-foreground shadow-brutal-sm ${className ?? ""}`}
    >
      {initials}
    </span>
  );
}
