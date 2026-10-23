"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { configSnippet } from "@/lib/profile-import/config-snippet";
import {
  savableProjects,
  toExperienceJson,
  toFaqsJson,
  type DraftResponse,
  type ProfileDraft,
} from "@/lib/profile-import/schema";

import { saveImportDraft, type SaveResult } from "./actions";

type Current = { photo: string; pronouns: "she" | "he" | "they" };

const initialState: DraftResponse = {
  id: 0,
  error: null,
  warnings: [],
  linkedinFailure: null,
  draft: null,
  dropped: [],
  fromFixture: false,
};

export function ImportClient({ hasKey, current }: { hasKey: boolean; current: Current }) {
  const [state, setState] = useState(initialState);
  const [pending, startDrafting] = useTransition();
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");

  // Posted to a route handler (file uploads), by hand, so the chosen files
  // stay in place when LinkedIn fails and the owner adds the PDF.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startDrafting(async () => {
      try {
        const res = await fetch("/api/admin/import", { method: "POST", body: data });
        const json = (await res.json().catch(() => null)) as DraftResponse | null;
        if (res.status === 401) {
          setState({ ...initialState, id: Date.now(), error: "Your admin session has ended. Log in again." });
        } else if (json) {
          setState(json);
        } else {
          setState({ ...initialState, id: Date.now(), error: `The import failed (HTTP ${res.status}).` });
        }
      } catch {
        setState({ ...initialState, id: Date.now(), error: "Could not reach the server. Try again." });
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <form
        onSubmit={onSubmit}
        className="flex min-w-0 flex-col gap-4 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="linkedin">LinkedIn profile URL</Label>
          <Input
            id="linkedin"
            name="linkedin"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://www.linkedin.com/in/your-name"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cv">CV file (PDF, .docx or .txt, up to 5 MB)</Label>
          <Input id="cv" name="cv" type="file" accept=".pdf,.docx,.txt" className="h-auto py-1.5" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="github">GitHub username</Label>
          <Input
            id="github"
            name="github"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="your-username"
            autoComplete="off"
          />
        </div>

        {state.linkedinFailure && (
          <div className="flex flex-col gap-3 rounded-lg border-2 border-border bg-secondary p-3 text-sm text-secondary-foreground">
            <p className="font-bold">{state.linkedinFailure}</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="linkedinPdf">LinkedIn PDF (from Save to PDF)</Label>
              <Input id="linkedinPdf" name="linkedinPdf" type="file" accept=".pdf" className="h-auto bg-card py-1.5" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || !hasKey}>
            {pending ? "Reading and drafting…" : "Generate draft"}
          </Button>
          {pending && <p className="text-sm text-muted-foreground">This takes up to a minute.</p>}
        </div>
        {state.error && (
          <p className="rounded-lg border-2 border-border bg-destructive/10 p-3 text-sm font-bold break-words text-destructive">
            {state.error}
          </p>
        )}
        {state.warnings.map((w) => (
          <p key={w} className="text-sm font-bold break-words text-destructive">
            {w}
          </p>
        ))}
      </form>

      {state.draft && (
        <Review
          key={state.id}
          initial={state.draft}
          dropped={state.dropped}
          fromFixture={state.fromFixture}
          current={current}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold">
      {label}
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="font-normal" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-normal" />
      )}
    </label>
  );
}

function Section({
  title,
  checked,
  onCheck,
  note,
  children,
}: {
  title: string;
  checked?: boolean;
  onCheck?: (v: boolean) => void;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black">{title}</h2>
        {onCheck && (
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onCheck(e.target.checked)}
              className="size-4 accent-primary"
            />
            Save this
          </label>
        )}
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {children}
    </section>
  );
}

function Review({
  initial,
  dropped,
  fromFixture,
  current,
}: {
  initial: ProfileDraft;
  dropped: string[];
  fromFixture: boolean;
  current: Current;
}) {
  const [draft, setDraft] = useState(initial);
  const projects = savableProjects(draft.projects);
  const roles = toExperienceJson(draft.experience);
  const faqs = toFaqsJson(draft.faqs);
  const [pick, setPick] = useState({
    experience: roles.length > 0,
    faqs: faqs.length > 0,
    projects: projects.map((p) => p.slug),
    removeSamples: true,
  });
  const [saving, startSaving] = useTransition();
  const [result, setResult] = useState<SaveResult | null>(null);
  const [copied, setCopied] = useState(false);
  const snippet = useMemo(() => configSnippet(draft, current), [draft, current]);

  const set = (update: (d: ProfileDraft) => void) =>
    setDraft((prev) => {
      const next = structuredClone(prev);
      update(next);
      return next;
    });

  function save() {
    setResult(null);
    startSaving(async () => setResult(await saveImportDraft(draft, pick)));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const nothingPicked = !pick.experience && !pick.faqs && pick.projects.length === 0 && !pick.removeSamples;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black">Review the draft</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check every value: the draft only uses facts from your sources, but it can still get
          things wrong. Untick anything you do not want.
          {fromFixture && " (Development: this draft came from PROFILE_IMPORT_FIXTURE, not from the AI provider.)"}
        </p>
        {dropped.length > 0 && (
          <div className="mt-3 rounded-lg border-2 border-border bg-secondary p-3 text-sm text-secondary-foreground">
            <p className="font-bold">Left out because it is not in your sources:</p>
            <ul className="mt-1 list-disc pl-5">
              {dropped.map((d) => (
                <li key={d} className="break-words">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Section
        title="Profile and home page"
        note="These live in site.config.ts, which a deployed site cannot change by itself. Edit them here, copy the snippet into site.config.ts, then commit and redeploy."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={draft.person.name} onChange={(v) => set((d) => void (d.person.name = v))} />
          <Field label="First name" value={draft.person.firstName} onChange={(v) => set((d) => void (d.person.firstName = v))} />
          <Field label="Initials" value={draft.person.initials} onChange={(v) => set((d) => void (d.person.initials = v.slice(0, 3)))} />
          <Field label="Role" value={draft.person.role} onChange={(v) => set((d) => void (d.person.role = v))} />
          <Field label="Location" value={draft.person.location} onChange={(v) => set((d) => void (d.person.location = v))} />
          <Field label="Contact email" value={draft.contact.email} onChange={(v) => set((d) => void (d.contact.email = v))} />
        </div>
        <Field label="One sentence about you" value={draft.person.oneLiner} onChange={(v) => set((d) => void (d.person.oneLiner = v))} multiline />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Headline start" value={draft.hero.headlineBefore} onChange={(v) => set((d) => void (d.hero.headlineBefore = v))} />
          <Field label="Highlighted word" value={draft.hero.headlineHighlight} onChange={(v) => set((d) => void (d.hero.headlineHighlight = v))} />
          <Field label="Headline end" value={draft.hero.headlineAfter} onChange={(v) => set((d) => void (d.hero.headlineAfter = v))} />
        </div>
        {draft.hero.paragraphs.map((p, i) => (
          <Field key={i} label={`Intro paragraph ${i + 1}`} value={p} onChange={(v) => set((d) => void (d.hero.paragraphs[i] = v))} multiline />
        ))}
        <Field label="SEO description" value={draft.seo.description} onChange={(v) => set((d) => void (d.seo.description = v))} />
        {draft.stats.length > 0 && (
          <div className="text-sm">
            <p className="font-bold">Stats</p>
            <ul className="mt-1 list-disc pl-5">
              {draft.stats.map((s) => (
                <li key={s.value} className="break-words">
                  <b>{s.value}</b>: {s.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">site.config.ts snippet</p>
            <Button type="button" variant="neutral" size="sm" onClick={copy}>
              {copied ? "Copied" : "Copy snippet"}
            </Button>
          </div>
          <pre className="max-h-80 max-w-full overflow-auto rounded-lg border-2 border-border bg-background p-3 text-xs">
            {snippet}
          </pre>
        </div>
      </Section>

      <Section
        title={`Experience (${roles.length})`}
        checked={pick.experience}
        onCheck={(v) => setPick({ ...pick, experience: v })}
        note={
          draft.experience.length > roles.length
            ? `${draft.experience.length - roles.length} role(s) without a title, company or start date are left out.`
            : undefined
        }
      >
        <ul className="flex flex-col gap-3">
          {roles.map((r) => (
            <li key={r.slug} className="min-w-0 text-sm">
              <p className="font-bold break-words">
                {r.title}, {r.company}
              </p>
              <p className="text-muted-foreground">
                {r.startDate.slice(0, 7)} to {r.endDate ? r.endDate.slice(0, 7) : "now"}
                {r.location ? `, ${r.location}` : ""}
              </p>
              {r.highlights.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {r.highlights.map((h) => (
                    <li key={h} className="break-words">
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`FAQs (${faqs.length})`} checked={pick.faqs} onCheck={(v) => setPick({ ...pick, faqs: v })}>
        {draft.faqs.map((f, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-2 border-b-2 border-border pb-3 last:border-b-0 last:pb-0">
            <Field label="Question" value={f.question} onChange={(v) => set((d) => void (d.faqs[i].question = v))} />
            <Field label="Answer" value={f.answer} onChange={(v) => set((d) => void (d.faqs[i].answer = v))} multiline />
          </div>
        ))}
      </Section>

      <Section title={`Projects (${projects.length})`} note="Projects are saved without images; add a cover and screenshots in Projects afterwards.">
        {draft.projects.map((p, i) =>
          p.slug ? (
            <div key={p.slug} className="flex min-w-0 flex-col gap-2 border-b-2 border-border pb-3 last:border-b-0 last:pb-0">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={pick.projects.includes(p.slug)}
                  onChange={(e) =>
                    setPick({
                      ...pick,
                      projects: e.target.checked ? [...pick.projects, p.slug] : pick.projects.filter((s) => s !== p.slug),
                    })
                  }
                  className="size-4 accent-primary"
                />
                Save /{p.slug} ({p.category})
              </label>
              <Field label="Title" value={p.title} onChange={(v) => set((d) => void (d.projects[i].title = v))} />
              <Field label="Summary" value={p.summary} onChange={(v) => set((d) => void (d.projects[i].summary = v))} multiline />
              <p className="text-xs break-words text-muted-foreground">
                {[p.years.join(", "), p.tags.map((t) => t.name).join(", "), p.repoUrl, p.liveUrl].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null
        )}
      </Section>

      <div className="flex min-w-0 flex-col gap-3 rounded-lg border-2 border-border bg-card p-4 shadow-brutal-sm">
        <label className="flex items-start gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={pick.removeSamples}
            onChange={(e) => setPick({ ...pick, removeSamples: e.target.checked })}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          Remove the sample persona&apos;s projects, roles and FAQs
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={save} disabled={saving || nothingPicked}>
            {saving ? "Saving…" : "Save to the database"}
          </Button>
          {result?.error && <p className="text-sm font-bold text-destructive">{result.error}</p>}
        </div>
        {result && result.error === null && (
          <p className="text-sm break-words">
            Saved {result.projects} project(s), {result.roles} role(s) and {result.faqs} FAQ(s)
            {result.removed
              ? `, and removed ${result.removed.projects} sample project(s), ${result.removed.roles} role(s) and ${result.removed.faqs} FAQ(s)`
              : ""}
            . The chat&apos;s search index is updating in the background. See{" "}
            <Link href="/admin/projects" className="font-bold underline">
              Projects
            </Link>
            , and paste the site.config.ts snippet above to finish.
          </p>
        )}
      </div>
    </div>
  );
}
