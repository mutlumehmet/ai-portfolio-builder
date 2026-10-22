"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlockType } from "@/lib/blocks";

type BlockData = Record<string, unknown>;
type BlockState = { clientId: string; type: BlockType; data: BlockData };

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "heading", label: "Heading" },
  { value: "paragraph", label: "Paragraph" },
  { value: "image", label: "Image" },
  { value: "diagram", label: "Diagram" },
  { value: "youtube", label: "YouTube" },
  { value: "code", label: "Code" },
  { value: "embed", label: "Embed" },
];

function defaultDataFor(type: BlockType): BlockData {
  switch (type) {
    case "heading":
      return { text: "", level: 2 };
    case "paragraph":
      return { text: "" };
    case "image":
      return { url: "", alt: "", caption: "" };
    case "diagram":
      return { url: "", alt: "", caption: "" };
    case "youtube":
      return { videoId: "", caption: "" };
    case "code":
      return { code: "", language: "" };
    case "embed":
      return { url: "", aspectRatio: "16:9", caption: "" };
  }
}

export function BlockEditor({
  initialBlocks,
}: {
  initialBlocks: { type: string; data: unknown }[];
}) {
  const [blocks, setBlocks] = useState<BlockState[]>(() =>
    initialBlocks.map((b) => ({
      clientId: crypto.randomUUID(),
      type: b.type as BlockType,
      data: (b.data as BlockData) ?? {},
    }))
  );

  function addBlock(type: BlockType) {
    setBlocks((prev) => [
      ...prev,
      { clientId: crypto.randomUUID(), type, data: defaultDataFor(type) },
    ]);
  }

  function removeBlock(clientId: string) {
    setBlocks((prev) => prev.filter((b) => b.clientId !== clientId));
  }

  function moveBlock(clientId: string, direction: -1 | 1) {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.clientId === clientId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateData(clientId: string, patch: BlockData) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.clientId === clientId ? { ...b, data: { ...b.data, ...patch } } : b
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="hidden"
        name="blocksJson"
        readOnly
        value={JSON.stringify(
          blocks.map(({ type, data }) => ({ type, data }))
        )}
      />

      {blocks.length === 0 && (
        <p className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No content blocks yet. Add one below.
        </p>
      )}

      {blocks.map((block, index) => (
        <div
          key={block.clientId}
          className="rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-md border-2 border-border bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground uppercase">
              {block.type}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={index === 0}
                onClick={() => moveBlock(block.clientId, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(block.clientId, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => removeBlock(block.clientId)}
              >
                Remove
              </Button>
            </div>
          </div>

          <BlockFields
            block={block}
            onChange={(patch) => updateData(block.clientId, patch)}
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2 border-t-2 border-dashed border-border pt-4">
        <span className="w-full text-xs font-bold text-muted-foreground uppercase">
          Add block
        </span>
        {BLOCK_TYPES.map((t) => (
          <Button
            key={t.value}
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => addBlock(t.value)}
          >
            + {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: BlockState;
  onChange: (patch: BlockData) => void;
}) {
  const d = block.data;

  switch (block.type) {
    case "heading":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Text</Label>
          <Input
            value={(d.text as string) ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </div>
      );
    case "paragraph":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Text</Label>
          <textarea
            className="min-h-24 w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm"
            value={(d.text as string) ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        </div>
      );
    case "image":
    case "diagram":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Image URL</Label>
            <Input
              value={(d.url as string) ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Alt text</Label>
            <Input
              value={(d.alt as string) ?? ""}
              onChange={(e) => onChange({ alt: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Caption (optional)</Label>
            <Input
              value={(d.caption as string) ?? ""}
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </div>
        </div>
      );
    case "youtube":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>YouTube video ID</Label>
            <Input
              value={(d.videoId as string) ?? ""}
              onChange={(e) => onChange({ videoId: e.target.value })}
              placeholder="dQw4w9WgXcQ"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Caption (optional)</Label>
            <Input
              value={(d.caption as string) ?? ""}
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </div>
        </div>
      );
    case "code":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Language (optional)</Label>
            <Input
              value={(d.language as string) ?? ""}
              onChange={(e) => onChange({ language: e.target.value })}
              placeholder="tsx"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <textarea
              className="min-h-32 w-full rounded-lg border-2 border-border bg-card px-3 py-2 font-mono text-sm"
              value={(d.code as string) ?? ""}
              onChange={(e) => onChange({ code: e.target.value })}
            />
          </div>
        </div>
      );
    case "embed":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Embed URL</Label>
            <Input
              value={(d.url as string) ?? ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://www.loom.com/embed/…"
            />
            <p className="text-xs text-muted-foreground">
              The iframe embed URL, not the page link. For example, Loom&apos;s
              &quot;Embed&quot; share option gives you a
              loom.com/embed/... URL.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Aspect ratio</Label>
            <select
              value={(d.aspectRatio as string) ?? "16:9"}
              onChange={(e) => onChange({ aspectRatio: e.target.value })}
              className="w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm"
            >
              <option value="16:9">16:9 (video)</option>
              <option value="1:1">1:1 (square)</option>
              <option value="4:3">4:3</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Caption (optional)</Label>
            <Input
              value={(d.caption as string) ?? ""}
              onChange={(e) => onChange({ caption: e.target.value })}
            />
          </div>
        </div>
      );
  }
}
