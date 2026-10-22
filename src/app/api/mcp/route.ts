import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { features, siteConfig, siteUrl } from "@/lib/config";
import { answerChatQuestion, checkJobFit } from "@/lib/rag";
import { aiRequestAllowed, featureOff, tooManyRequests } from "@/lib/rate-limit";

const { person } = siteConfig;
const toolSlug = person.firstName.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "owner";

const handler = createMcpHandler(
  (server) => {
    if (features.chat) {
      server.registerTool(
        `ask_about_${toolSlug}`,
        {
          title: `Ask about ${person.firstName}`,
          description: `Ask a question about ${person.name}'s work experience, projects and skills. Answers are grounded in the content of ${person.pronouns.possessive} portfolio site, not general knowledge.`,
          inputSchema: z.object({
            question: z.string().min(1).max(2000).describe(`The question to ask about ${person.firstName}`),
          }),
        },
        async ({ question }) => {
          const answer = await answerChatQuestion(question);
          return { content: [{ type: "text", text: answer }] };
        }
      );
    }

    if (features.fitCheck) {
      server.registerTool(
        "check_job_fit",
        {
          title: "Check job fit",
          description: `Paste a job description and get a structured analysis of how well ${person.name}'s background matches it: a verdict, concrete strengths, and honest gaps.`,
          inputSchema: z.object({
            jobDescription: z.string().min(20).max(8000).describe("The full job description text"),
          }),
        },
        async ({ jobDescription }) => {
          const result = await checkJobFit(jobDescription);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
      );
    }

    if (features.cv) {
      server.registerTool(
        "get_cv",
        {
          title: "Get CV",
          description: `Get the download link for ${person.name}'s current CV (PDF).`,
          inputSchema: z.object({}),
        },
        async () => ({ content: [{ type: "text", text: `${siteUrl}/cv` }] })
      );
    }
  },
  { serverInfo: { name: siteConfig.mcp.serverName, version: "1.0.0" } }
);

// Every MCP call shares the same per-IP limits as the site's own AI endpoints.
async function limitedHandler(request: Request) {
  if (!features.mcp) return featureOff();
  if (!aiRequestAllowed(request)) return tooManyRequests();
  return handler(request);
}

export { limitedHandler as GET, limitedHandler as POST };
