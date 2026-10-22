// Reads a public GitHub profile and its best repositories through the REST API.
// No auth is needed; GITHUB_TOKEN is used when set, for a higher rate limit.
// Pinned repositories need GraphQL with auth, so the pick is: own repos that
// are not forks and not archived, by stars, then by most recent push.

const API = "https://api.github.com";
const TIMEOUT_MS = 10_000;
const MAX_REPOS = 6;
const MAX_README = 4_000;

export type GitHubRepo = {
  name: string;
  url: string;
  description: string;
  homepage: string;
  topics: string[];
  language: string;
  stars: number;
  pushedAt: string;
  readme: string;
};

export type GitHubProfile = {
  username: string;
  url: string;
  name: string;
  bio: string;
  blog: string;
  location: string;
  company: string;
  repos: GitHubRepo[];
};

export type GitHubResult = { status: "ok"; profile: GitHubProfile } | { status: "failed"; reason: string };

/** Accepts "octocat", "@octocat" or "https://github.com/octocat". */
export function normaliseGitHubUser(input: string): string | null {
  const raw = input.trim().replace(/^@/, "");
  const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
  const user = fromUrl ? fromUrl[1] : raw;
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(user) ? user : null;
}

class GitHubError extends Error {}

async function gh(path: string, accept = "application/vnd.github+json") {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "ai-portfolio-starter-profile-import",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new GitHubError("GitHub did not answer (network error or timeout)");
  }
  if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const when = Number.isFinite(reset) && reset > 0 ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}` : " Try again later";
    throw new GitHubError(
      `GitHub's rate limit for requests without a token was reached.${when}, or set GITHUB_TOKEN to a personal access token`
    );
  }
  return res;
}

export async function fetchGitHubProfile(input: string): Promise<GitHubResult> {
  const username = normaliseGitHubUser(input);
  if (!username) return { status: "failed", reason: "that is not a valid GitHub username" };

  try {
    const userRes = await gh(`/users/${username}`);
    if (userRes.status === 404) return { status: "failed", reason: `there is no GitHub user called ${username}` };
    if (!userRes.ok) return { status: "failed", reason: `GitHub answered HTTP ${userRes.status}` };
    const user = (await userRes.json()) as Record<string, unknown>;

    const reposRes = await gh(`/users/${username}/repos?per_page=100&type=owner&sort=pushed`);
    const all = reposRes.ok ? ((await reposRes.json()) as Record<string, unknown>[]) : [];
    const picked = all
      .filter((r) => !r.fork && !r.archived && !r.private)
      .sort(
        (a, b) =>
          Number(b.stargazers_count ?? 0) - Number(a.stargazers_count ?? 0) ||
          String(b.pushed_at ?? "").localeCompare(String(a.pushed_at ?? ""))
      )
      .slice(0, MAX_REPOS);

    const repos: GitHubRepo[] = [];
    for (const r of picked) {
      let readme = "";
      const readmeRes = await gh(`/repos/${username}/${String(r.name)}/readme`, "application/vnd.github.raw");
      if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, MAX_README);
      else await readmeRes.body?.cancel();
      repos.push({
        name: String(r.name),
        url: String(r.html_url ?? `https://github.com/${username}/${String(r.name)}`),
        description: String(r.description ?? ""),
        homepage: String(r.homepage ?? ""),
        topics: Array.isArray(r.topics) ? r.topics.map(String) : [],
        language: String(r.language ?? ""),
        stars: Number(r.stargazers_count ?? 0),
        pushedAt: String(r.pushed_at ?? ""),
        readme,
      });
    }

    return {
      status: "ok",
      profile: {
        username,
        url: `https://github.com/${username}`,
        name: String(user.name ?? ""),
        bio: String(user.bio ?? ""),
        blog: String(user.blog ?? ""),
        location: String(user.location ?? ""),
        company: String(user.company ?? ""),
        repos,
      },
    };
  } catch (err) {
    if (err instanceof GitHubError) return { status: "failed", reason: err.message };
    throw err;
  }
}

/** The GitHub profile as plain text for the model. */
export function gitHubToText(p: GitHubProfile) {
  const lines = [
    `GitHub profile: ${p.url}`,
    p.name && `Name: ${p.name}`,
    p.bio && `Bio: ${p.bio}`,
    p.company && `Company: ${p.company}`,
    p.location && `Location: ${p.location}`,
    p.blog && `Website: ${p.blog}`,
  ].filter(Boolean);
  for (const r of p.repos) {
    const block = [
      `Repository: ${r.name}`,
      `Repository URL: ${r.url}`,
      r.description && `Description: ${r.description}`,
      r.homepage && `Homepage: ${r.homepage}`,
      r.topics.length ? `Topics: ${r.topics.join(", ")}` : "",
      r.language && `Main language: ${r.language}`,
      `Stars: ${r.stars}`,
      r.pushedAt && `Last push: ${r.pushedAt.slice(0, 10)}`,
      r.readme && `README (truncated):\n${r.readme}`,
    ].filter(Boolean);
    lines.push("", block.join("\n"));
  }
  return lines.join("\n");
}
