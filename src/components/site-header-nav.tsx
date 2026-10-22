"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export type SiteHeaderProps = {
  active?: "work" | "side-projects" | "experience";
  back?: { href: string; label: string };
};

type SiteHeaderNavProps = SiteHeaderProps & {
  name: string;
  initials: string;
  showCv: boolean;
};

const NAV_LINKS = [
  { key: "work", href: "/projects", label: "Work" },
  { key: "side-projects", href: "/side-projects", label: "Side projects" },
  { key: "experience", href: "/experience", label: "Experience" },
] as const;

export function SiteHeaderNav({ active, back, name, initials, showCv }: SiteHeaderNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <nav className="flex items-center justify-between border-b-2 border-border py-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-black">
          <Logo initials={initials} className="size-8" />
          {name}
        </Link>
        {back ? (
          <Link href={back.href} className="text-base font-bold hover:underline">
            {back.label}
          </Link>
        ) : (
          <>
            <div className="hidden items-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`text-base font-bold ${active === link.key ? "underline" : "hover:underline"}`}
                >
                  {link.label}
                </Link>
              ))}
              {showCv && (
                <Button asChild>
                  <a href="/cv">Download CV</a>
                </Button>
              )}
            </div>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex size-10 items-center justify-center rounded-lg border-2 border-border bg-card shadow-brutal-sm md:hidden"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </>
        )}
      </nav>

      {!back && menuOpen && (
        <div className="flex flex-col gap-4 border-b-2 border-border py-6 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-base font-bold ${active === link.key ? "underline" : "hover:underline"}`}
            >
              {link.label}
            </Link>
          ))}
          {showCv && (
            <Button asChild className="self-start">
              <a href="/cv">Download CV</a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
