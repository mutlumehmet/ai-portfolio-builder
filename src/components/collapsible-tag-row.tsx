"use client";

import { useEffect, useRef, useState } from "react";

// Two chip rows tall by default; expands to show the rest on demand.
// Chips are h-9 (36px) with a gap-2 (8px) row gap, so two rows sit at 80px.
// The overflow-hidden clipping box gets a bit of inner padding (offset by a
// matching negative margin on the wrapper) so chips' hover translate/shadow
// on the left/top edge isn't cut off by the clip boundary itself.
const ROW_PADDING = 4;
const COLLAPSED_ROW_HEIGHT = 80 + ROW_PADDING * 2;

export function CollapsibleTagRow({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > COLLAPSED_ROW_HEIGHT + 4);
  }, [children]);

  return (
    <div>
      <div className="-m-1">
        <div
          ref={rowRef}
          className="flex flex-wrap gap-2 overflow-hidden p-1 transition-[max-height] duration-300"
          style={{ maxHeight: expanded ? 2000 : COLLAPSED_ROW_HEIGHT }}
        >
          {children}
        </div>
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
