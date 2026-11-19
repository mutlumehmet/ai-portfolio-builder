// PostHog analytics. Off unless NEXT_PUBLIC_POSTHOG_KEY is set. The library is
// loaded once the browser is idle, so it stays out of the main bundle and the
// first paint. Events go through this site's /ingest path (proxied at the edge
// in netlify.toml, and by next.config.ts rewrites elsewhere), so fewer ad
// blockers drop them. The admin area is never tracked.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key && typeof window !== "undefined") {
  const start = () => {
    import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: "/ingest",
          ui_host: process.env.NEXT_PUBLIC_POSTHOG_REGION === "us" ? "https://us.posthog.com" : "https://eu.posthog.com",
          // Page views and page leaves on client-side navigation too.
          defaults: "2025-05-24",
          // Anonymous visitors don't get person profiles.
          person_profiles: "identified_only",
          // No surveys on this site; skip loading their script.
          disable_surveys: true,
          before_send: (event) => (location.pathname.startsWith("/admin") ? null : event),
        });
      })
      .catch(() => {
        // Analytics must never break the page.
      });
  };
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 2000);
}
