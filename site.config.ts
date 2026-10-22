// Everything that makes this site *yours* lives in this one file.
//
// The sample values describe Odile Brandqvist, a fictional product engineer.
// Replace them with your own details, then replace the sample content in
// content/ (projects, experience, FAQs) and re-run `npm run db:seed` and
// `npm run rag:ingest`.
//
// Feature flags can also be switched per deployment with environment
// variables (see .env.example), which win over the values below.

import { themes } from "./themes";

export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  // Public URL of the deployed site, no trailing slash. Used for SEO,
  // share images, the MCP connect command and the CV link the MCP returns.
  // NEXT_PUBLIC_SITE_URL overrides it.
  url: "http://localhost:3000",

  person: {
    name: "Odile Brandqvist",
    // Shown in the logo mark, the favicon and the share image.
    initials: "OB",
    // Used in the chat prompt and the MCP tool name (ask_about_<firstName>).
    firstName: "Odile",
    // he / she / they: used in a few UI sentences ("check her CV").
    pronouns: { subject: "she", object: "her", possessive: "her" },
    role: "Product Engineer",
    location: "Edinburgh, Scotland",
    // A square image in public/. Any format next/image supports.
    photo: "/avatar.svg",
    // One or two sentences used in the footer and by the chat assistant.
    oneLiner:
      "Product engineer who builds calm, offline-first software for people who work on their feet: drivers, nurses and warehouse teams.",
  },

  contact: {
    email: "hello@example.com",
  },

  // Rendered only when set. Leave a value empty ("") to hide it.
  socials: {
    github: "https://github.com/example",
    linkedin: "https://www.linkedin.com/in/example",
    x: "",
  },

  seo: {
    title: "Odile Brandqvist | Product Engineer",
    description: "Offline-first product engineering for teams that work away from a desk.",
    // Short line for the share (Open Graph) image.
    tagline: "Product Engineer, offline-first by default",
    // Let search engines index the site. Set to false while you are still
    // replacing the sample content.
    index: true,
  },

  // Colours for the whole site. The neo-brutalist structure (thick borders,
  // hard shadows) stays; the theme only changes the hues. Ready-made themes:
  // block, cobalt, coral, burst, twist, mint, playful, nature, earthy, and the
  // pastels peach, lavender and sky, and the neutrals stone, sand, slate and
  // graphite (see themes.ts). To change single colours:
  // theme: { ...themes.coral, primary: "#b83a22" },
  theme: themes.coral,

  hero: {
    badge: "Product Engineer",
    // The headline is split so the middle word gets the tilted highlight box.
    headlineBefore: "Software that works",
    headlineHighlight: "offline",
    headlineAfter: "and still feels calm.",
    // **double asterisks** make a word bold.
    paragraphs: [
      "Nine years building **offline-first** apps for people who work away from a desk: delivery drivers, ward nurses and warehouse teams.",
      "I care about the boring parts that make software trustworthy: **sync**, **conflict handling** and screens you can read in bright sunlight.",
      "Before software I was a **civil engineer**, which is why I still sketch everything on squared paper first.",
    ],
  },

  home: {
    // Leave the array empty to hide the section.
    stats: [
      {
        value: "38%",
        description: "Fewer missed delivery slots after the offline route app replaced paper manifests.",
        href: "/projects/route-ledger",
      },
      {
        value: "0",
        description: "Lost records across two winters of patchy rural signal, thanks to a sync queue with replay.",
        href: "/projects/route-ledger",
      },
      {
        value: "4 min",
        description: "Median check-in time at the clinic kiosk, down from eleven at the front desk.",
        href: "/projects/clinic-queue",
      },
      {
        value: "120+",
        description: "Allotment plots planned with the free crop rotation planner side project.",
        href: "/projects/allotment-planner",
      },
    ],
    journey: {
      heading: "From bridges and drainage plans to offline-first product engineering.",
      steps: [
        {
          period: "2014 to 2017",
          description: "Graduate civil engineer at Lanternmoth Surveying, writing spreadsheet macros that slowly turned into small web tools.",
        },
        {
          period: "2017 to 2021",
          description: "Developer at Quillfern Labs, then product engineer at Fernwhistle Health, building lab and clinic software.",
        },
        {
          period: "2021 to now",
          description: "Senior then staff product engineer at Brindlecart and Saltmarsh Transit Co., leading offline-first mobile and dashboard work.",
        },
      ],
    },
  },

  experience: {
    intro: "Nine years in product engineering, after three in civil engineering. Most of it spent on software that has to keep working when the signal does not.",
  },

  // The AI assistant ("Ask about ..." tab) and the MCP tool.
  chat: {
    tabLabel: "Ask about Odile",
    description: "Answers come from the project, experience and FAQ content on this site, not from general knowledge.",
    // Extra instructions about tone, added to the system prompt.
    style: "Friendly and plain. Refer to Odile in the third person.",
    // Buttons shown before the first message.
    suggestions: [
      "What has Odile built that works offline?",
      "Has Odile worked in healthcare?",
      "Which technologies does Odile use most?",
    ],
    // Typed into the empty input one by one, as a hint that visitors can type.
    placeholderPrompts: [
      "How did the route app handle sync conflicts?",
      "What did Odile do before software?",
      "Does Odile do design work too?",
      "What are the side projects about?",
    ],
  },

  fitCheck: {
    tabLabel: "Check job fit",
    description: "Paste a job description, or upload a PDF, .docx or .txt file, for a fit analysis grounded in the content on this site.",
    // What the fit check should weigh, added to its system prompt.
    criteria:
      "Weigh hands-on delivery, offline-first and sync experience, mobile and web product work, and working closely with non-technical users.",
  },

  mcp: {
    tabLabel: "MCP server",
    description: "This site is also a remote MCP server. Connect it to any MCP client (for example Claude Code or Claude Desktop) to ask questions or check a job fit from your own AI assistant.",
    // Name shown to MCP clients and used in the connect command.
    serverName: "odile-portfolio",
  },

  cv: {
    // A PDF in public/. The /cv route serves it as a download.
    file: "cv.pdf",
    // Filename the visitor's browser saves. {date} becomes e.g. "October-2026".
    downloadName: "Odile-Brandqvist-CV-{date}.pdf",
  },

  admin: {
    label: "Odile Brandqvist / admin",
  },

  footer: {
    builtWith: "Built with AI Portfolio Starter: Next.js, Prisma, Postgres with pgvector and OpenAI.",
  },

  // Iframe embeds in project pages (embed blocks). An empty list allows any
  // https host; add hosts (e.g. "www.loom.com") to allow only those.
  embeds: {
    allowedHosts: [] as string[],
  },

  // Canned answers checked before the AI is called. Only used when the
  // easterEggs feature is on. Patterns are case-insensitive regular expressions.
  easterEggs: [
    {
      pattern: "\\b(salary|day rate|rate card|compensation)\\b",
      answer: "Happy to talk about that directly. Drop a line to {email} and we can find a time.",
    },
  ],

  // Defaults; each can be overridden with an env var (see .env.example).
  features: {
    chat: true,
    fitCheck: true,
    // Upload a PDF, .docx or .txt into the fit check. Needs fitCheck.
    parseJd: true,
    mcp: true,
    admin: true,
    cv: true,
    easterEggs: false,
    rateLimit: true,
  },

  rateLimit: {
    // Per visitor IP, shared by chat, fit check, file upload and MCP.
    perMinute: 10,
    perDay: 100,
  },
};
