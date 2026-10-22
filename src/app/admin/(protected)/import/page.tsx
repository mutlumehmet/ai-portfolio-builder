import { siteConfig } from "@/lib/config";

import { ImportClient } from "./import-client";

export default function AdminImportPage() {
  // The fixture is a development and test aid (see AGENTS.md); production always needs the key.
  const hasKey =
    Boolean(process.env.OPENAI_API_KEY) ||
    (Boolean(process.env.PROFILE_IMPORT_FIXTURE) && process.env.NODE_ENV !== "production");
  const subject = siteConfig.person.pronouns.subject;

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Import</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Draft your site from your LinkedIn profile, a CV and your GitHub profile. The draft is
          written by this site&apos;s own OpenAI key (one model call, your CV text is sent to
          OpenAI with it). You review everything before it is saved.
        </p>
      </div>
      {!hasKey && (
        <p className="mb-6 rounded-lg border-2 border-border bg-destructive/10 p-3 text-sm font-bold text-destructive">
          The import needs an OpenAI key: add OPENAI_API_KEY to this deployment&apos;s environment
          variables and redeploy.
        </p>
      )}
      <ImportClient
        hasKey={hasKey}
        current={{
          photo: siteConfig.person.photo,
          pronouns: subject === "he" || subject === "she" ? subject : "they",
        }}
      />
    </div>
  );
}
