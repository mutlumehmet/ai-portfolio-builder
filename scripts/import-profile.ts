/**
 * Draft site content from a LinkedIn profile, a CV and a GitHub profile.
 *
 *   npm run import -- --linkedin <url> --cv <path> --github <user>
 *       Reads the sources, asks your own AI provider (AI_API_KEY) for a draft,
 *       prints a summary and the draft JSON. Writes nothing.
 *       --cv can be given more than once (for example a CV and a LinkedIn PDF).
 *       --out draft.json  also saves the draft JSON to a file.
 *       --sources-only    prints what was read and stops before the model call.
 *
 *   npm run import -- --apply draft.json
 *       Writes an approved draft: site.config.ts (person, contact, links, SEO,
 *       hero, stats, journey) and content/ (projects, experience, FAQs; the
 *       sample project files are removed). Then run `npm run db:seed` and,
 *       with the AI layer on, `npm run rag:ingest`.
 *
 * A coding agent can also write its own draft (same shape) and use --apply.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

import { buildProfileDraft, sourcesToText } from "../src/lib/profile-import/draft";
import { gatherSources } from "../src/lib/profile-import/gather";
import { draftSchema } from "../src/lib/profile-import/schema";
import { formatDraftSummary } from "../src/lib/profile-import/summary";
import { writeDraftContent } from "./lib/content-writer";
import { applyDraftToConfig } from "./lib/site-config-writer";

function parseArgs(argv: string[]) {
  const out: { linkedin?: string; cv: string[]; github?: string; out?: string; apply?: string; sourcesOnly: boolean } = {
    cv: [],
    sourcesOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} needs a value.`);
      return v;
    };
    if (a === "--linkedin") out.linkedin = value();
    else if (a === "--cv") out.cv.push(value());
    else if (a === "--github") out.github = value();
    else if (a === "--out") out.out = value();
    else if (a === "--apply") out.apply = value();
    else if (a === "--sources-only") out.sourcesOnly = true;
    else throw new Error(`Unknown option ${a}. See the comment at the top of scripts/import-profile.ts.`);
  }
  return out;
}

function apply(path: string) {
  const draft = draftSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
  const config = applyDraftToConfig(readFileSync("site.config.ts", "utf-8"), draft);
  writeFileSync("site.config.ts", config.source);
  console.log(`Updated site.config.ts: person, contact and links${config.written.length ? `, ${config.written.join(", ")}` : ""}.`);
  if (config.skipped.length) {
    console.log(`Could not safely replace ${config.skipped.join(", ")} in site.config.ts; edit those by hand.`);
  }
  const content = writeDraftContent(draft);
  console.log(`Wrote ${content.written.join(", ")}.`);
  if (content.removed.length) console.log(`Removed sample files ${content.removed.join(", ")}.`);
  console.log("\nNext: remove the sample projects from the database (npm run project:delete -- <slug>),");
  console.log("then npm run db:seed, and npm run rag:ingest if the AI layer is on.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply) return apply(args.apply);

  if (!args.linkedin && args.cv.length === 0 && !args.github) {
    throw new Error("Give at least one of --linkedin <url>, --cv <path> or --github <user>.");
  }

  const files = args.cv.map((path) => ({ name: basename(path), buffer: readFileSync(path) }));
  const { sources, warnings } = await gatherSources({ linkedinUrl: args.linkedin, files, githubUser: args.github });

  console.log("SOURCES");
  if (sources.linkedin) console.log(`  LinkedIn: ${sources.linkedin.status === "ok" ? `read (${sources.linkedin.text.length} characters)` : "not read"}`);
  for (const d of sources.documents) console.log(`  ${d.label}: read (${d.text.length} characters)`);
  if (sources.github) {
    console.log(
      `  GitHub: ${sources.github.status === "ok" ? `read, ${sources.github.profile.repos.length} repositories (${sources.github.profile.repos.map((r) => r.name).join(", ")})` : "not read"}`
    );
  }
  for (const w of warnings) console.log(`\n! ${w}`);

  if (args.sourcesOnly) {
    console.log(`\n${sourcesToText(sources)}`);
    return;
  }

  const result = await buildProfileDraft(sources);
  if (result.fromFixture) console.log("\n(Draft read from PROFILE_IMPORT_FIXTURE, not from the AI provider.)");
  console.log(`\nDRAFT SUMMARY\n\n${formatDraftSummary(result.draft, result.dropped)}`);
  const text = JSON.stringify(result.draft, null, 2);
  console.log(`\nDRAFT JSON\n${text}`);
  if (args.out) {
    writeFileSync(args.out, text + "\n");
    console.log(`\nSaved the draft to ${args.out}. After review: npm run import -- --apply ${args.out}`);
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
