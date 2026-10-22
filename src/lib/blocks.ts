import { z } from "zod";

export const headingBlockSchema = z.object({
  text: z.string(),
  level: z.union([z.literal(2), z.literal(3)]).default(2),
});

export const paragraphBlockSchema = z.object({
  text: z.string(),
});

export const imageBlockSchema = z.object({
  url: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

export const youtubeBlockSchema = z.object({
  videoId: z.string(),
  caption: z.string().optional(),
});

export const diagramBlockSchema = z.object({
  url: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
});

export const codeBlockSchema = z.object({
  code: z.string(),
  language: z.string().optional(),
});

// Generic iframe embed (Loom, Figma, Vimeo, etc.) for anything without its
// own special-cased block. `url` must be the embed URL (e.g. Loom's
// "/embed/..." link), not a page URL to paste raw HTML into.
export const embedBlockSchema = z.object({
  url: z.string(),
  aspectRatio: z.enum(["16:9", "1:1", "4:3"]).default("16:9"),
  caption: z.string().optional(),
});

export const blockDataSchemas = {
  heading: headingBlockSchema,
  paragraph: paragraphBlockSchema,
  image: imageBlockSchema,
  youtube: youtubeBlockSchema,
  diagram: diagramBlockSchema,
  code: codeBlockSchema,
  embed: embedBlockSchema,
} as const;

export type BlockType = keyof typeof blockDataSchemas;

export function parseBlockData<T extends BlockType>(type: T, data: unknown) {
  return blockDataSchemas[type].parse(data) as z.infer<
    (typeof blockDataSchemas)[T]
  >;
}
