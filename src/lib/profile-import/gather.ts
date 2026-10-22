// Collects every source the owner gave. Each part is optional and reports its
// own problem, so one failing source never hides the others.
import { CvReadError, readCvBuffer } from "./cv";
import type { ImportSources } from "./draft";
import { fetchGitHubProfile } from "./github";
import { fetchLinkedInProfile, linkedInFailureMessage } from "./linkedin";

export type ImportInput = {
  linkedinUrl?: string;
  /** CV files (PDF, .docx or .txt), including a LinkedIn "Save to PDF" export. */
  files?: { name: string; buffer: Buffer; label?: string }[];
  githubUser?: string;
};

export type GatherResult = {
  sources: ImportSources;
  /** Problems to show the owner, one sentence each. */
  warnings: string[];
  /** Set when a LinkedIn URL was given but the page could not be read. */
  linkedinFailure?: string;
};

export async function gatherSources(input: ImportInput): Promise<GatherResult> {
  const sources: ImportSources = { documents: [] };
  const warnings: string[] = [];
  let linkedinFailure: string | undefined;

  const linkedinUrl = input.linkedinUrl?.trim();
  const githubUser = input.githubUser?.trim();

  const [linkedin, github] = await Promise.all([
    linkedinUrl ? fetchLinkedInProfile(linkedinUrl) : undefined,
    githubUser ? fetchGitHubProfile(githubUser) : undefined,
  ]);

  if (linkedin) {
    sources.linkedin = linkedin;
    if (linkedin.status === "failed") {
      linkedinFailure = linkedInFailureMessage(linkedin.reason);
      warnings.push(linkedinFailure);
    }
  }
  if (github) {
    sources.github = github;
    if (github.status === "failed") warnings.push(`We could not read your GitHub profile: ${github.reason}.`);
  }

  for (const file of input.files ?? []) {
    try {
      const text = await readCvBuffer(file.buffer, file.name);
      sources.documents.push({ label: file.label ?? `CV file ${file.name}`, text });
    } catch (err) {
      if (err instanceof CvReadError) warnings.push(`${file.name}: ${err.message}`);
      else throw err;
    }
  }

  return { sources, warnings, linkedinFailure };
}
