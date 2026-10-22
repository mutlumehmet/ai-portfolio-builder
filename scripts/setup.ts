// Interactive first-run setup: `npm run setup`.
//
// Asks for your details, a colour theme, a database and (optionally) an OpenAI
// key, then writes site.config.ts and .env, creates the tables, loads the
// sample content, builds the chat's search index and offers to start the site.
// Safe to run again: it asks before replacing an existing .env.
import { execSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import { themes } from "../themes";

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

// Replaces the string value of `key: "..."` inside site.config.ts. JSON.stringify
// escapes quotes and backslashes, so any answer stays a valid string literal.
function setString(source: string, key: string, value: string) {
  const pattern = new RegExp(`(\\b${key}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!pattern.test(source)) throw new Error(`site.config.ts has no "${key}" field to update.`);
  return source.replace(pattern, `$1${JSON.stringify(value)}`);
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

async function main() {
  console.log(bold("\nAI Portfolio Starter setup\n"));
  console.log("Answer a few questions; press Enter to keep the value in brackets.\n");

  // 1. About you
  const name = await ask("Your full name", "Odile Brandqvist");
  const firstName = await ask("First name, as the chat should call you", name.split(/\s+/)[0]);
  const initials = await ask(
    "Initials for the logo",
    name
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3)
  );
  const pronoun = await choose("Pronouns used in a few sentences", ["she", "he", "they"] as const, "she");
  const role = await ask("Your role or job title", "Product Engineer");
  const location = await ask("Where you are based", "Edinburgh, Scotland");
  const oneLiner = await ask("One sentence about you (footer and chat)", "");
  const email = await ask("Contact email", "hello@example.com");
  const linkedin = await ask("LinkedIn URL (Enter to hide)", "");
  const github = await ask("GitHub URL (Enter to hide)", "");

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
  console.log(dim("\nThe AI layer (chat, job-fit check, MCP) needs an OpenAI key. Leave it empty for a plain portfolio."));
  const openaiKey = await ask("OpenAI API key (Enter to skip)", "");

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
  writeFileSync("site.config.ts", config);
  console.log(`\n${bold("Updated")} site.config.ts`);

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
  console.log("Your name, role, links and colours are set. The hero text, stats, journey and the");
  console.log("sample projects are still the sample persona's: edit site.config.ts and /admin, or");
  console.log("ask your coding agent (see AGENTS.md). Projects from the command line:");
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
