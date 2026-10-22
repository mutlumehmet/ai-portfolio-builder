// Writes an approved import draft into content/ for `npm run db:seed`.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SAMPLE_PROJECT_SLUGS } from "../../src/lib/profile-import/samples";
import {
  savableProjects,
  toExperienceJson,
  toFaqsJson,
  toProjectJson,
  type ProfileDraft,
} from "../../src/lib/profile-import/schema";
import { projectSchema } from "./upsert";

const json = (data: unknown) => JSON.stringify(data, null, 2) + "\n";

/**
 * Writes content/projects/<slug>.json for each project, content/experience.json
 * and content/faqs.json, and removes the sample persona's project files.
 * Every project file is checked against the same schema the seed uses.
 */
export function writeDraftContent(draft: ProfileDraft, root = process.cwd()) {
  const dir = join(root, "content", "projects");
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];

  const projects = savableProjects(draft.projects).map((p, i) => projectSchema.parse(toProjectJson(p, (i + 1) * 10)));
  const removed: string[] = [];
  for (const slug of SAMPLE_PROJECT_SLUGS) {
    const file = join(dir, `${slug}.json`);
    if (existsSync(file) && !projects.some((p) => p.slug === slug)) {
      rmSync(file);
      removed.push(`content/projects/${slug}.json`);
    }
  }
  for (const p of projects) {
    writeFileSync(join(dir, `${p.slug}.json`), json(p));
    written.push(`content/projects/${p.slug}.json`);
  }

  writeFileSync(join(root, "content", "experience.json"), json(toExperienceJson(draft.experience)));
  written.push("content/experience.json");
  writeFileSync(join(root, "content", "faqs.json"), json(toFaqsJson(draft.faqs)));
  written.push("content/faqs.json");

  return { written, removed };
}
