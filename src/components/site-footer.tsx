import Link from "next/link";

import { Logo } from "@/components/logo";
import { features, siteConfig, socialLinks } from "@/lib/config";

const year = new Date().getFullYear();

export function SiteFooter() {
  const { person, contact, footer } = siteConfig;

  return (
    <footer className="border-t-2 border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 text-xl font-black">
              <Logo initials={person.initials} className="size-8" />
              {person.name}
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{person.oneLiner}</p>
          </div>

          <div className="flex flex-wrap gap-12">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-black tracking-wide text-muted-foreground uppercase">
                Site
              </span>
              <Link href="/projects" className="text-sm font-bold hover:underline">
                Work
              </Link>
              <Link href="/experience" className="text-sm font-bold hover:underline">
                Experience
              </Link>
              {features.cv && (
                <a href="/cv" className="text-sm font-bold hover:underline">
                  Download CV
                </a>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-black tracking-wide text-muted-foreground uppercase">
                Contact
              </span>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-sm font-bold hover:underline">
                  {contact.email}
                </a>
              )}
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-border pt-6 text-xs text-muted-foreground">
          <span>
            © {year} {person.name}.
          </span>
          {footer.builtWith && <span>{footer.builtWith}</span>}
        </div>
      </div>
    </footer>
  );
}
