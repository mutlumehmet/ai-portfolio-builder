// Interactive first-run setup: `npm run setup`.
//
// Asks for your details, a colour theme, a database and (optionally) an OpenAI
// key, then writes site.config.ts and .env, creates the tables, loads the
// sample content, builds the chat's search index and offers to start the site.
// Safe to run again: it asks before replacing an existing .env.
//
// It can start from your LinkedIn profile, CV and GitHub: the first question
// offers an import, which drafts your details, home page text, experience,
// FAQs and projects with your own OpenAI key. You review the draft before
// anything is written, and every later question still lets you change a value.
import { execSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { CvReadError, readCvBuffer } from "../src/lib/profile-import/cv";
import { buildProfileDraft, hasUsableSource, ProfileImportError } from "../src/lib/profile-import/draft";
import { gatherSources } from "../src/lib/profile-import/gather";
import { removeSampleContent } from "../src/lib/profile-import/save";
import type { ProfileDraft } from "../src/lib/profile-import/schema";
import { formatDraftSummary } from "../src/lib/profile-import/summary";
import { themes } from "../themes";
import { writeDraftContent } from "./lib/content-writer";
import { applyDraftBlocks, setString } from "./lib/site-config-writer";

// Answers are read from a queue rather than with rl.question(), so piped
// input (an agent or a script answering the questions) is not dropped.
const rl = createInterface({ input });
const lines: string[] = [];
const waiting: ((line: string) => void)[] = [];
let closed = false;
rl.on("line", (line) => {
  const next = waiting.shift();
  if (next) next(line);
  else lines.push(line);
});
rl.on("close", () => {
  closed = true;
  waiting.splice(0).forEach((resolve) => resolve(""));
});

function readLine(prompt: string) {
  output.write(prompt);
  if (lines.length > 0) return Promise.resolve(lines.shift() as string);
  if (closed) return Promise.resolve("");
  return new Promise<string>((resolve) => waiting.push(resolve));
}

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

async function ask(question: string, fallback = "") {
  const hint = fallback ? dim(` (${fallback})`) : "";
  const answer = (await readLine(`${question}${hint}: `)).trim();
  return answer || fallback;
}

async function askYes(question: string, fallback = true) {
  const answer = (await ask(`${question} ${fallback ? "[Y/n]" : "[y/N]"}`)).toLowerCase();
  return answer ? answer.startsWith("y") : fallback;
}

async function choose<T extends string>(question: string, options: readonly T[], fallback: T) {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${i + 1}. ${o}${o === fallback ? dim(" (default)") : ""}`));
  for (;;) {
    const answer = await ask("Pick a number or a name", fallback);
    const byNumber = options[Number(answer) - 1];
    const byName = options.find((o) => o.toLowerCase() === answer.toLowerCase());
    if (byNumber ?? byName) return (byNumber ?? byName) as T;
    console.log("Not one of the options, try again.");
  }
}

function run(command: string, env: NodeJS.ProcessEnv = process.env) {
  console.log(dim(`\n> ${command}`));
  execSync(command, { stdio: "inherit", env });
}

async function waitForDocker() {
  for (let i = 0; i < 30; i++) {
    try {
      execSync("docker compose exec -T db pg_isready -U portfolio", { stdio: "ignore" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("The Docker database did not start. Check `docker compose logs db`.");
}

// The first question. An answer that is neither yes nor no (an older piped
// script that starts with the name) is put back for the next question.
async function askImport() {
  const answer = (await readLine(`Import from LinkedIn, CV and GitHub? ${dim("[Y/n]")}: `)).trim();
  if (!answer || /^y(es)?$/i.test(answer)) return true;
  if (/^no?$/i.test(answer)) return false;
  lines.unshift(answer);
  return false;
}

function readFileSource(path: string) {
  const clean = path.trim().replace(/^['"]|['"]$/g, "");
  if (!existsSync(clean)) {
    console.log(`No file at ${clean}, so it is left out.`);
    return null;
  }
  return { name: basename(clean), buffer: readFileSync(clean), path: clean };
}

type ImportOutcome = { draft: ProfileDraft; apiKey: string; cvPdf?: string };

async function runImport(): Promise<ImportOutcome | null> {
  console.log(dim("\nEach one is optional: press Enter to skip it."));
  const linkedinUrl = await ask("LinkedIn profile URL (Enter to skip)");
  const cvPath = await ask("CV file path, PDF, .docx or .txt (Enter to skip)");
  const githubUser = await ask("GitHub username (Enter to skip)");
  if (!linkedinUrl && !cvPath && !githubUser) {
    console.log("Nothing to import, so the import is skipped.");
    return null;
  }
  console.log(dim("The draft is written by your own OpenAI key: your CV and profile text go to OpenAI with it. Nothing is written until you say yes."));
  const apiKey = await ask("OpenAI API key for the draft (Enter to skip the import)");
  // PROFILE_IMPORT_FIXTURE stands in for the model in development and tests (see AGENTS.md).
  if (!apiKey && !process.env.PROFILE_IMPORT_FIXTURE) {
    console.log("No OpenAI key, so there is no draft: the import is skipped and setup carries on with the questions.");
    return null;
  }

  const cv = cvPath ? readFileSource(cvPath) : null;
  console.log(dim("\nReading your sources..."));
  const { sources, warnings, linkedinFailure } = await gatherSources({
    linkedinUrl,
    githubUser,
    files: cv ? [cv] : [],
  });
  for (const w of warnings) if (w !== linkedinFailure) console.log(`! ${w}`);

  if (linkedinFailure) {
    console.log(`\n${bold("!")} ${linkedinFailure}`);
    const pdfPath = await ask("Path to your LinkedIn PDF or CV (Enter to continue without)");
    const pdf = pdfPath ? readFileSource(pdfPath) : null;
    if (pdf) {
      try {
        sources.documents.push({ label: `LinkedIn PDF or CV ${pdf.name}`, text: await readCvBuffer(pdf.buffer, pdf.name) });
      } catch (err) {
        if (!(err instanceof CvReadError)) throw err;
        console.log(`! ${pdf.name}: ${err.message}`);
      }
    }
  }

  const read = [
    sources.linkedin?.status === "ok" ? "your LinkedIn profile" : "",
    ...sources.documents.map((doc) => doc.label),
    sources.github?.status === "ok" ? `GitHub (${sources.github.profile.repos.length} repositories)` : "",
  ].filter(Boolean);
  if (read.length) console.log(`Read: ${read.join(", ")}.`);

  if (!hasUsableSource(sources)) {
    console.log("None of the sources could be read, so the import is skipped.");
    return null;
  }

  console.log(dim("Writing the draft (one OpenAI call)..."));
  let result;
  try {
    result = await buildProfileDraft(sources, { apiKey: apiKey || undefined });
  } catch (err) {
    if (!(err instanceof ProfileImportError)) throw err;
    console.log(`! ${err.message} The import is skipped; setup carries on with the questions.`);
    return null;
  }

  console.log(`\n${bold("Your draft")}\n`);
  console.log(formatDraftSummary(result.draft, result.dropped));
  console.log(dim("\nThe next questions use these values as defaults, so you can still change each one."));
  if (!(await askYes("\nUse this?", true))) {
    console.log("Draft discarded. Setup carries on with the questions.");
    return null;
  }
  return { draft: result.draft, apiKey, cvPdf: cv && /\.pdf$/i.test(cv.name) ? cv.path : undefined };
}

async function main() {
  console.log(bold("\nAI Portfolio Starter setup\n"));
  console.log("Answer a few questions; press Enter to keep the value in brackets.\n");

  // 0. Optional import from LinkedIn, a CV and GitHub
  const imported = (await askImport()) ? await runImport() : null;
  const draft = imported?.draft;
  const d = draft?.person;
  if (imported) console.log("");

  // 1. About you
  const name = await ask("Your full name", d?.name || "Odile Brandqvist");
  const firstName = await ask(
    "First name, as the chat should call you",
    d?.firstName && name === d.name ? d.firstName : name.split(/\s+/)[0]
  );
  const initials = await ask(
    "Initials for the logo",
    (d?.initials && name === d.name ? d.initials : "") ||
    name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3)
  );
  const pronoun = await choose(
    "Pronouns used in a few sentences",
    ["she", "he", "they"] as const,
    d?.pronouns ?? (draft ? "they" : "she")
  );
  const role = await ask("Your role or job title", d?.role || "Product Engineer");
  const location = await ask("Where you are based", d?.location || "Edinburgh, Scotland");
  const oneLiner = await ask("One sentence about you (footer and chat)", d?.oneLiner || "");
  const email = await ask("Contact email", draft?.contact.email || "hello@example.com");
  const linkedin = await ask("LinkedIn URL (Enter to hide)", draft?.socials.linkedin || "");
  const github = await ask("GitHub URL (Enter to hide)", draft?.socials.github || "");

  // 2. Look
  const themeNames = Object.keys(themes) as (keyof typeof themes)[];
  const theme = await choose("Colour theme (preview: docs/images/themes.png)", themeNames, "coral");

  // 3. Database
  const db = await choose(
    "Database",
    ["Neon (free, hosted, works with Vercel)", "Docker (local, on this machine)"] as const,
    "Neon (free, hosted, works with Vercel)"
  );
  const useDocker = db.startsWith("Docker");
  let databaseUrl = "postgresql://portfolio:portfolio@localhost:5432/portfolio";
  if (!useDocker) {
    console.log(dim("Create a free project at https://neon.tech and copy its connection string."));
    for (;;) {
      databaseUrl = await ask("Neon connection string (postgresql://...)");
      if (/^postgres(ql)?:\/\//.test(databaseUrl)) break;
      console.log("That does not look like a postgresql:// URL, try again.");
    }
  }

  // 4. AI layer
  let openaiKey = imported?.apiKey ?? "";
  if (openaiKey) {
    console.log(dim("\nThe AI layer (chat, job-fit check, MCP) uses the OpenAI key you gave for the import."));
  } else {
    console.log(dim("\nThe AI layer (chat, job-fit check, MCP) needs an OpenAI key. Leave it empty for a plain portfolio."));
    openaiKey = await ask("OpenAI API key (Enter to skip)", "");
  }

  const useCvPdf = imported?.cvPdf
    ? await askYes(`Use ${basename(imported.cvPdf)} as the CV visitors download (public/cv.pdf)?`, true)
    : false;

  // 5. Admin
  const generated = randomBytes(12).toString("base64url");
  let adminPassword = await ask("Password for /admin", generated);
  while (/["\\\n]/.test(adminPassword)) {
    adminPassword = await ask("Please avoid quotes and backslashes. Password for /admin", generated);
  }

  // Write site.config.ts
  let config = readFileSync("site.config.ts", "utf-8");
  config = setString(config, "name", name);
  config = setString(config, "initials", initials);
  config = setString(config, "firstName", firstName);
  config = setString(config, "role", role);
  config = setString(config, "location", location);
  if (oneLiner) config = setString(config, "oneLiner", oneLiner);
  config = setString(config, "email", email);
  config = setString(config, "linkedin", linkedin);
  config = setString(config, "github", github);
  config = setString(config, "title", `${name} | ${role}`);
  const pronouns = { she: ["she", "her", "her"], he: ["he", "him", "his"], they: ["they", "them", "their"] }[pronoun];
  config = config.replace(
    /pronouns:\s*\{[^}]*\}/,
    `pronouns: { subject: "${pronouns[0]}", object: "${pronouns[1]}", possessive: "${pronouns[2]}" }`
  );
  config = config.replace(/theme:\s*themes\.\w+,/, `theme: themes.${theme},`);
  config = setString(config, "downloadName", `${name.trim().replace(/\s+/g, "-")}-CV-{date}.pdf`);
  config = setString(config, "label", `${name} / admin`);
  let blocks: ReturnType<typeof applyDraftBlocks> | null = null;
  if (draft) {
    blocks = applyDraftBlocks(config, draft);
    config = blocks.source;
  }
  writeFileSync("site.config.ts", config);
  console.log(`\n${bold("Updated")} site.config.ts${blocks?.written.length ? ` (with your ${blocks.written.join(", ")})` : ""}`);
  if (blocks?.skipped.length) {
    console.log(`Could not safely replace ${blocks.skipped.join(", ")} in site.config.ts; edit those by hand.`);
  }

  if (draft) {
    const content = writeDraftContent(draft);
    console.log(`${bold("Wrote")} ${content.written.join(", ")}`);
    if (content.removed.length) console.log(`${bold("Removed")} the sample project files (${content.removed.length})`);
  }
  if (useCvPdf && imported?.cvPdf) {
    copyFileSync(imported.cvPdf, "public/cv.pdf");
    console.log(`${bold("Copied")} your CV to public/cv.pdf`);
  }

  // Write .env
  const writeEnv = !existsSync(".env") || (await askYes(".env already exists. Replace it?", false));
  if (writeEnv) {
    const lines = [
      "# Written by `npm run setup`. Never commit this file.",
      `DATABASE_URL="${databaseUrl}"`,
      `ADMIN_PASSWORD="${adminPassword}"`,
      `SESSION_SECRET="${randomBytes(32).toString("base64")}"`,
      `OPENAI_API_KEY="${openaiKey}"`,
    ];
    if (!openaiKey) {
      lines.push("# No OpenAI key: the AI layer is off. Add a key and remove these to turn it on.");
      lines.push("FEATURE_CHAT=false", "FEATURE_FIT_CHECK=false", "FEATURE_MCP=false");
    }
    writeFileSync(".env", lines.join("\n") + "\n");
    console.log(`${bold("Wrote")} .env`);
  }

  // Database, content and search index
  const env = { ...process.env, DATABASE_URL: databaseUrl, OPENAI_API_KEY: openaiKey };
  if (useDocker) {
    run("docker compose up -d db");
    await waitForDocker();
  }
  run("npx prisma migrate deploy", env);
  if (draft) {
    // The seed upserts by slug, so the sample persona's rows are removed first.
    const prisma = new PrismaClient({ adapter: createDbAdapter(databaseUrl) });
    try {
      const removed = await removeSampleContent(prisma);
      console.log(`Removed the sample content from the database: ${removed.projects} projects, ${removed.roles} roles, ${removed.faqs} FAQs.`);
    } finally {
      await prisma.$disconnect();
    }
  }
  run("npx prisma db seed", env);
  if (openaiKey) {
    try {
      run("npm run rag:ingest", env);
    } catch {
      console.log("Building the search index failed. Check the OpenAI key, then run `npm run rag:ingest`.");
    }
  }

  console.log(bold("\nDone."));
  console.log(`Admin password: ${adminPassword} ${dim("(also in .env)")}`);
  if (draft) {
    console.log("Your details, home page text, experience, FAQs and projects come from your import.");
    console.log("The chat persona and suggestions in site.config.ts are still the sample's, and the");
    console.log("project pages have no images yet: edit site.config.ts and /admin, or ask your coding");
    console.log("agent (see AGENTS.md). Projects from the command line:");
  } else {
    console.log("Your name, role, links and colours are set. The hero text, stats, journey and the");
    console.log("sample projects are still the sample persona's: edit site.config.ts and /admin, or");
    console.log("ask your coding agent (see AGENTS.md). Projects from the command line:");
  }
  console.log(dim("  npm run project:upsert -- path/to/project.json   (shape: scripts/example-project.json)"));
  console.log(dim("  npm run project:delete -- <slug>"));

  const start = await askYes("\nStart the site now on http://localhost:3000?", true);
  rl.close();
  if (start) spawn("npm", ["run", "dev"], { stdio: "inherit", env });
}

main().catch((err) => {
  rl.close();
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
