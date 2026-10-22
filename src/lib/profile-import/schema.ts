// The shape of an import draft. No Node or server imports here, so the admin
// review screen (a client component) can use the same types and checks.
import { z } from "zod";

// Models sometimes answer null for "unknown"; both become an empty value.
// Too long values are cut rather than failing the whole draft.
const text = (max: number) =>
  z.preprocess((v) => (v === null || v === undefined ? "" : String(v).trim().slice(0, max)), z.string());
const list = <T extends z.ZodType>(item: T, max: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v.slice(0, max) : []), z.array(item));

const section = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess((v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}), z.object(shape));

const slug = z.preprocess(
  (v) =>
    String(v ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  z.string().regex(/^[a-z0-9-]*$/)
);

// "YYYY-MM-DD", or empty when the source gives no date.
const isoDate = z.preprocess((v) => {
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return "";
}, z.string());

export const draftProjectSchema = z.object({
  slug,
  title: text(120),
  summary: text(400),
  role: text(120),
  years: z.preprocess(
    (v) => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n >= 1950 && n <= 2100).slice(0, 12) : []),
    z.array(z.number().int())
  ),
  category: z.preprocess((v) => (v === "commercial" ? "commercial" : "personal"), z.enum(["commercial", "personal"])),
  repoUrl: text(300),
  liveUrl: text(300),
  tags: list(
    z.object({
      name: text(40),
      kind: z.preprocess((v) => (v === "industry" ? "industry" : "technology"), z.enum(["technology", "industry"])),
    }),
    12
  ),
  // Text blocks only: headings and paragraphs.
  blocks: list(
    z.object({
      type: z.preprocess((v) => (v === "heading" ? "heading" : "paragraph"), z.enum(["heading", "paragraph"])),
      text: text(2000),
    }),
    8
  ),
});

export const draftSchema = z.object({
  person: section({
    name: text(120),
    firstName: text(60),
    initials: text(3),
    role: text(120),
    location: text(120),
    oneLiner: text(300),
    // Only when the sources state them.
    pronouns: z.preprocess((v) => (v === "she" || v === "he" || v === "they" ? v : null), z.enum(["she", "he", "they"]).nullable()),
  }),
  contact: section({ email: text(200) }),
  socials: section({ linkedin: text(300), github: text(300), x: text(300) }),
  seo: section({ title: text(120), description: text(300), tagline: text(120) }),
  hero: section({
    badge: text(60),
    headlineBefore: text(80),
    headlineHighlight: text(40),
    headlineAfter: text(80),
    paragraphs: list(text(500), 4),
  }),
  stats: list(z.object({ value: text(20), description: text(200) }), 4),
  journey: section({
    heading: text(160),
    steps: list(z.object({ period: text(40), description: text(300) }), 6),
  }),
  experience: list(
    z.object({
      slug,
      title: text(120),
      company: text(120),
      location: text(120),
      startDate: isoDate,
      endDate: isoDate,
      highlights: list(text(400), 6),
    }),
    15
  ),
  faqs: list(z.object({ question: text(200), answer: text(800) }), 10),
  projects: list(draftProjectSchema, 8),
});

export type ProfileDraft = z.infer<typeof draftSchema>;
export type DraftProject = z.infer<typeof draftProjectSchema>;
export type DraftExperience = ProfileDraft["experience"][number];

export function emptyDraft(): ProfileDraft {
  return draftSchema.parse({});
}

/** Turns a draft project into the content/projects/*.json shape (scripts/example-project.json). */
export function toProjectJson(p: DraftProject, order = 0) {
  return {
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    ...(p.liveUrl ? { liveUrl: p.liveUrl } : {}),
    ...(p.repoUrl ? { repoUrl: p.repoUrl } : {}),
    ...(p.role ? { role: p.role } : {}),
    years: [...new Set(p.years)].sort((a, b) => a - b),
    category: p.category,
    featured: true,
    order,
    tags: p.tags.filter((t) => t.name),
    blocks: p.blocks
      .filter((b) => b.text)
      .map((b) => (b.type === "heading" ? { type: "heading", data: { text: b.text } } : { type: "paragraph", data: { text: b.text } })),
  };
}

/** The content/experience.json shape. Roles without a start date cannot be saved. */
export function toExperienceJson(roles: DraftExperience[]) {
  return roles
    .filter((r) => r.title && r.company && r.startDate)
    .map((r) => ({
      slug: r.slug || `${r.company}-${r.startDate.slice(0, 4)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      title: r.title,
      company: r.company,
      ...(r.location ? { location: r.location } : {}),
      startDate: r.startDate,
      endDate: r.endDate || null,
      highlights: r.highlights.filter(Boolean),
    }));
}

export function toFaqsJson(faqs: ProfileDraft["faqs"]) {
  return faqs.filter((f) => f.question && f.answer);
}

/** Projects that can be saved: they need a slug, a title and a summary. */
export function savableProjects(projects: DraftProject[]) {
  return projects.filter((p) => p.slug && p.title && p.summary);
}

/** What POST /api/admin/import returns to the review screen. */
export type DraftResponse = {
  /** Changes on every run, so the review screen starts fresh for a new draft. */
  id: number;
  error: string | null;
  warnings: string[];
  linkedinFailure: string | null;
  draft: ProfileDraft | null;
  dropped: string[];
  fromFixture: boolean;
};
