"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { siteConfig } from "@site-config";

export function McpPanel({ url }: { url: string }) {
  const MCP_COMMAND = `claude mcp add --transport http ${siteConfig.mcp.serverName} ${url}`;

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(MCP_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Server URL: <code className="font-mono font-bold text-foreground">{url}</code>. In Claude
        Code, run:
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-border bg-foreground px-4 py-3">
        <code className="overflow-x-auto font-mono text-sm text-background">{MCP_COMMAND}</code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy command"
          className="flex flex-none items-center gap-1.5 rounded-md border-2 border-background/30 px-2 py-1 text-xs font-bold text-background hover:border-background/60"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
