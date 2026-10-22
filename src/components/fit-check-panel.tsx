"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@site-config";

type FitResult = {
  verdict: "strong fit" | "partial fit" | "weak fit";
  strengths: string[];
  gaps: string[];
};

const VERDICT_STYLES: Record<FitResult["verdict"], string> = {
  "strong fit": "bg-primary text-primary-foreground",
  "partial fit": "bg-secondary text-secondary-foreground",
  "weak fit": "bg-muted text-muted-foreground",
};

export function FitCheckPanel({ allowUpload, showCv }: { allowUpload: boolean; showCv: boolean }) {
  const { person, contact, socials } = siteConfig;
  const pronoun = person.pronouns;
  const [jobDescription, setJobDescription] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FitResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-jd", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setJobDescription(data.text);
    } catch {
      setError("Couldn't read that file. Try pasting the text instead.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsChecking(true);
    try {
      const res = await fetch("/api/fit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong. Try again shortly.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here…"
          rows={6}
          className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          {allowUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="neutral"
                size="sm"
                disabled={isParsing}
                onClick={() => fileInputRef.current?.click()}
              >
                {isParsing ? "Reading file…" : "Upload PDF / .docx / .txt →"}
              </Button>
            </>
          )}
          <Button type="submit" size="sm" disabled={isChecking || jobDescription.trim().length < 20}>
            {isChecking ? "Analyzing…" : "Check fit →"}
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border-2 border-border bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="mt-5 flex flex-col gap-4 border-t-2 border-dashed border-border pt-5">
          <span
            className={`w-fit rounded-lg border-2 border-border px-3 py-1 text-sm font-black uppercase shadow-brutal-sm ${VERDICT_STYLES[result.verdict]}`}
          >
            {result.verdict}
          </span>

          {result.strengths.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Strengths
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {result.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Gaps
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {result.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                This is a guide, not proof. Not everything about {person.firstName}&apos;s
                experience is captured on this site, so treat it as a starting point.
                {(socials.linkedin || showCv || contact.email) && " For more, "}
                {socials.linkedin && (
                  <>
                    see {pronoun.possessive}{" "}
                    <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                      LinkedIn
                    </a>
                    {showCv || contact.email ? ", " : "."}
                  </>
                )}
                {showCv && (
                  <>
                    <a href="/cv" className="font-bold underline">
                      download {pronoun.possessive} CV
                    </a>
                    {contact.email ? ", or " : "."}
                  </>
                )}
                {contact.email && (
                  <>
                    <a href={`mailto:${contact.email}`} className="font-bold underline">
                      email {pronoun.object} directly
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
