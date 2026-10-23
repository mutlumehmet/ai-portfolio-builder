# Security

## Reporting a vulnerability

Please report security issues privately through GitHub's **Report a vulnerability** button on the Security tab of this repository (private vulnerability reporting). Do not open a public issue for a security problem.

Include what you found, how to reproduce it, and what an attacker could do with it. You should get a first reply within a week. This is a small open source project maintained in spare time, so there is no bug bounty.

Only the latest version on the default branch is supported.

## Before you deploy your own copy: cost warning

Your deployed site exposes public AI endpoints (`/api/chat`, `/api/fit-check`, `/api/parse-jd`, `/api/mcp`). Every call spends credit on **your** OpenAI account, and anyone on the internet can call them. The built-in rate limiter keeps counters in memory per server instance, so it slows one client down but is not a global cap.

Do these two things before sharing your link:

1. **Set a monthly budget on your OpenAI project.** In the OpenAI dashboard, open the project that owns your API key and set a usage limit. This is the only hard stop on spend.
2. **Add a Vercel Firewall rate limit rule** (or your host's equivalent) for `/api/*`, for example 20 requests per minute per IP. This stops abuse before it reaches your functions.

Also:

* Use a long random `ADMIN_PASSWORD` and `SESSION_SECRET`. The app refuses the example values in production.
* Turn off features you do not use (`FEATURE_MCP=false`, for example). A disabled endpoint returns 404.
* Keep `AI_API_KEY` (or `OPENAI_API_KEY`), any `EMBEDDING_API_KEY` and `DATABASE_URL` only in your host's environment settings, never in the repository.

## What the template already does

* Every admin server action checks the admin session itself, not only the `/admin` proxy.
* Login attempts are limited per IP, and the post-login redirect only accepts paths inside `/admin`.
* Inputs are capped: 2,000 characters per question, 8,000 per job description, 5 MB per upload.
* Prompts treat visitor text as data, refuse off-topic requests, and the fit-check output is validated with zod.
* Embedded iframes are sandboxed, with an optional host allowlist in `site.config.ts`.

## Known limits

* Admin sessions are signed cookies valid for 7 days. Logging out deletes the cookie, but a copied cookie stays valid until it expires. Rotate `SESSION_SECRET` to end every session.
* The rate limiter is per instance and in memory (see above).
* No prompt is injection-proof. Keep anything private out of your content: the chat can repeat whatever is in the database.
