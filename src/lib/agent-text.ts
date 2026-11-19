import { parseBlockData, type BlockType } from "@/lib/blocks";

// Helpers for the plain-text pages written for AI agents (/llms-full.txt,
// /agents.md): content blocks as Markdown, and role dates as text.

type Block = { type: BlockType; data: unknown; order: number };

// Headings and paragraphs as Markdown; images, diagrams and embeds as their
// alt text or caption, so nothing an agent cannot see is left unexplained.
export function blocksToMarkdown(blocks: Block[], headingOffset = 1) {
  return [...blocks]
    .sort((a, b) => a.order - b.order)
    .map((b) => {
      switch (b.type) {
        case "heading": {
          const d = parseBlockData("heading", b.data);
          return `${"#".repeat(d.level + headingOffset)} ${d.text}`;
        }
        case "paragraph":
          return parseBlockData("paragraph", b.data).text;
        case "image":
        case "diagram": {
          const d = parseBlockData(b.type, b.data);
          return `[${b.type === "image" ? "Image" : "Diagram"}: ${d.caption || d.alt}]`;
        }
        case "code": {
          const d = parseBlockData("code", b.data);
          return "```" + (d.language ?? "") + "\n" + d.code + "\n```";
        }
        default:
          return null;
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function roleDates(start: Date, end: Date | null) {
  return `${month(start)} to ${end ? month(end) : "present"}`;
}
