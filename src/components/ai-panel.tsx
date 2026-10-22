"use client";

import { useState } from "react";

import { ChatPanel } from "@/components/chat-panel";
import { FitCheckPanel } from "@/components/fit-check-panel";
import { McpPanel } from "@/components/mcp-panel";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@site-config";

type Tab = "chat" | "fit-check" | "mcp";

export type AiPanelProps = {
  chat: boolean;
  fitCheck: boolean;
  parseJd: boolean;
  mcp: boolean;
  cv: boolean;
  mcpUrl: string;
};

export function AiPanel({ chat, fitCheck, parseJd, mcp, cv, mcpUrl }: AiPanelProps) {
  const tabs = (
    [
      chat && { value: "chat", label: siteConfig.chat.tabLabel, description: siteConfig.chat.description },
      fitCheck && {
        value: "fit-check",
        label: siteConfig.fitCheck.tabLabel,
        description: siteConfig.fitCheck.description,
      },
      mcp && { value: "mcp", label: siteConfig.mcp.tabLabel, description: siteConfig.mcp.description },
    ] as const
  ).filter(Boolean) as { value: Tab; label: string; description: string }[];

  const [tab, setTab] = useState<Tab | undefined>(tabs[0]?.value);
  const current = tabs.find((t) => t.value === tab) ?? tabs[0];
  if (!current) return null;

  return (
    <Card className="gap-4 py-8">
      <CardContent className="px-6">
        {tabs.length > 1 && (
          <div
            className="mb-4 grid gap-1 rounded-lg border-2 border-border bg-secondary p-1"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                aria-current={current.value === t.value}
                className={`rounded-md px-3 py-2 text-center text-sm font-bold transition-colors ${
                  current.value === t.value
                    ? "border-2 border-border bg-primary text-primary-foreground shadow-brutal-sm"
                    : "border-2 border-transparent text-secondary-foreground/70 hover:text-secondary-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        {tabs.length === 1 && <h2 className="mb-2 text-2xl font-black">{current.label}</h2>}
        <p className="text-muted-foreground">{current.description}</p>
      </CardContent>

      <CardContent className="px-6">
        {current.value === "chat" && <ChatPanel />}
        {current.value === "fit-check" && <FitCheckPanel allowUpload={parseJd} showCv={cv} />}
        {current.value === "mcp" && <McpPanel url={mcpUrl} />}
      </CardContent>
    </Card>
  );
}
