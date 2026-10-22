import Image from "next/image";
import Link from "next/link";

import { CollapsibleTagRow } from "@/components/collapsible-tag-row";
import { AiPanel } from "@/components/ai-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProjectCoverImage } from "@/components/project-cover-image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { features, siteConfig, siteUrl, socialLinks } from "@/lib/config";
import { prisma } from "@/lib/prisma";

// Rendered per request, so `next build` never needs a database and content
// written by the scripts or the admin shows up straight away.
export const dynamic = "force-dynamic";

// Turns **bold** in config strings into <strong>.
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

export default async function Home() {
  const [projects, personalProjects, stackTags, faqs] = await Promise.all([
    prisma.project.findMany({
      where: { featured: true, category: "commercial" },
      orderBy: { order: "asc" },
      include: { tags: true },
      take: 6,
    }),
    prisma.project.findMany({
      where: { featured: true, category: "personal" },
      orderBy: { order: "asc" },
      include: { tags: true },
      take: 8,
    }),
    prisma.tag.findMany({
      where: { kind: "technology" },
      orderBy: [{ projects: { _count: "desc" } }, { name: "asc" }],
    }),
    prisma.faq.findMany({ orderBy: { order: "asc" } }),
  ]);

  const { hero, home, person, contact } = siteConfig;
  const { stats, journey } = home;
  const linkedin = socialLinks.find((l) => l.label === "LinkedIn");
  const showAi = features.chat || features.fitCheck || features.mcp;

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="grid grid-cols-1 gap-8 py-16 md:grid-cols-[1fr_320px] md:gap-x-10 md:py-20">
          <div className="justify-self-center text-center md:justify-self-start md:text-left">
            <Badge className="mb-6 bg-secondary px-4 py-1.5 text-sm text-secondary-foreground">
              {hero.badge}
            </Badge>
            <h1 className="mx-auto max-w-xl text-5xl leading-[1.02] font-black tracking-tight text-balance md:mx-0 md:max-w-none md:text-6xl">
              {hero.headlineBefore}{" "}
              <span className="inline-block -rotate-1 rounded-md border-2 border-border bg-primary px-2 text-primary-foreground shadow-brutal-sm">
                {hero.headlineHighlight}
              </span>{" "}
              {hero.headlineAfter}
            </h1>
            <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 text-lg text-muted-foreground md:mx-0 md:max-w-none">
              {hero.paragraphs.map((p) => (
                <p key={p}>
                  <RichText text={p} />
                </p>
              ))}
            </div>
          </div>

          <div className="justify-self-center md:col-start-2 md:row-start-1 md:row-span-2 md:flex md:h-full md:items-center md:justify-center">
            <div className="size-56 rotate-2 overflow-hidden rounded-lg border-2 border-border shadow-brutal md:size-64">
              <Image
                src={person.photo}
                alt={person.name}
                width={512}
                height={512}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:justify-start">
            <Button size="lg" asChild>
              <Link href="/projects">See the work →</Link>
            </Button>
            {contact.email && (
              <Button size="lg" variant="neutral" asChild>
                <a href={`mailto:${contact.email}`}>Get in touch</a>
              </Button>
            )}
            {linkedin && (
              <Button size="lg" variant="neutral" asChild>
                <a href={linkedin.href} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </Button>
            )}
          </div>
        </section>

        {stats.length > 0 && (
        <section className="pb-20">
          <div className="mb-10 flex items-center gap-3">
            <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
              Impact
            </span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.value} className="flex flex-col">
                <span className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
                  {stat.value}
                </span>
                <p className="mt-3 text-sm text-muted-foreground">{stat.description}</p>
                {stat.href && (
                  <Link
                    href={stat.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    Learn more →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
        )}

        {showAi && (
          <section className="pb-24">
            <AiPanel
              chat={features.chat}
              fitCheck={features.fitCheck}
              parseJd={features.parseJd}
              mcp={features.mcp}
              cv={features.cv}
              mcpUrl={`${siteUrl}/api/mcp`}
            />
          </section>
        )}

        <section className="pb-20">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
              Stack
            </span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>

          <CollapsibleTagRow>
            {stackTags.map((tag) => (
              <StackChip key={tag.id} label={tag.name} />
            ))}
          </CollapsibleTagRow>
        </section>

        {journey.steps.length > 0 && (
        <section className="relative overflow-hidden pb-24">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 left-0 text-[110px] leading-none font-black tracking-tight text-foreground/5 uppercase select-none md:text-[180px]"
          >
            Journey
          </span>

          <h2 className="max-w-2xl text-3xl font-black tracking-tight text-balance md:text-4xl">
            {journey.heading}
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {journey.steps.map((step, i) => (
              <div
                key={step.period}
                className={`${i > 0 ? "md:border-l-2 md:border-border md:pl-8" : ""}`}
              >
                <span className="text-lg font-black text-primary">{step.period}</span>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <Link
            href="/experience"
            className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            See full experience →
          </Link>
        </section>
        )}

        <section id="work" className="pb-24">
          <div className="mb-6 flex items-center gap-3">
            <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
              Selected work
            </span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <Card className="h-full gap-0 overflow-hidden py-0 transition-transform hover:-translate-y-0.5">
                  <ProjectCoverImage
                    id={project.id}
                    coverImageUrl={project.coverImageUrl}
                    title={project.title}
                    year={project.year}
                    yearRange={project.yearRange}
                    years={project.years}
                    category={project.category}
                    liveUrl={project.liveUrl}
                    repoUrl={project.repoUrl}
                  />
                  <CardHeader className="pt-5">
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription>{project.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 pt-3 pb-6">
                    {project.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={tag.kind === "industry" ? "accent" : "default"}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button variant="neutral" size="lg" asChild>
              <Link href="/projects">See all work →</Link>
            </Button>
          </div>
        </section>

        {features.cv && (
        <section className="mb-12">
          <Card className="flex-row flex-wrap items-center justify-between gap-6 bg-foreground py-8 text-background">
            <CardContent className="px-6">
              <h3 className="text-2xl font-black">Want the full picture?</h3>
              <p className="mt-1 text-background/80">
                CV, project write-ups, or ask the assistant above. It answers
                from the content on this site.
              </p>
            </CardContent>
            <CardContent className="px-6">
              <Button size="lg" asChild>
                <a href="/cv">Download CV →</a>
              </Button>
            </CardContent>
          </Card>
        </section>
        )}

        {personalProjects.length > 0 && (
          <section className="pb-24">
            <div className="mb-6 flex items-center gap-3">
              <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
                Side projects
              </span>
              <span className="h-0.5 flex-1 bg-border" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {personalProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.slug}`}>
                  <Card className="h-full gap-0 overflow-hidden py-0 transition-transform hover:-translate-y-0.5">
                    <ProjectCoverImage
                      id={project.id}
                      coverImageUrl={project.coverImageUrl}
                      title={project.title}
                      year={project.year}
                      yearRange={project.yearRange}
                      years={project.years}
                      category={project.category}
                      liveUrl={project.liveUrl}
                      repoUrl={project.repoUrl}
                    />
                    <CardHeader className="pt-5">
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <CardDescription>{project.summary}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-3 pb-6">
                      {project.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={tag.kind === "industry" ? "accent" : "default"}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Button variant="neutral" size="lg" asChild>
                <Link href="/side-projects">See all side projects →</Link>
              </Button>
            </div>
          </section>
        )}

        {faqs.length > 0 && (
        <section className="pb-24">
          <div className="mb-10 flex items-center gap-3">
            <span className="rounded-lg border-2 border-border bg-foreground px-3 py-1 text-xs font-black tracking-wide text-background uppercase">
              FAQ
            </span>
            <span className="h-0.5 flex-1 bg-border" />
          </div>

          <Accordion className="mx-auto max-w-3xl">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <p>{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function StackChip({ label }: { label: string }) {
  return (
    <span className="rounded-lg border-2 border-border bg-card px-3 py-1.5 text-sm font-bold shadow-brutal-sm">
      {label}
    </span>
  );
}
