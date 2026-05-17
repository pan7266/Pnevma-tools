"use client";

import Link from "next/link";
import { useAppSettings } from "@/components/AppSettings";
import { PnevmaMark } from "@/components/ToolIcons";
import { getLocale } from "@/locales";

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const { lang } = useAppSettings();
  const locale = getLocale(lang);
  const common = locale.common;
  const legal = locale.legal;
  const page = type === "privacy" ? legal.privacy : legal.terms;

  return (
    <main className="app legal-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <PnevmaMark />
          </div>
          <div>
            <h1>{page.title}</h1>
            <p className="subhead">{page.subtitle}</p>
          </div>
        </div>
        <Link className="button secondary" href="/spot">
          {legal.backToTools}
        </Link>
      </header>

      <section className="panel panel-pad legal-panel">
        <p className="data-note">{legal.owner}</p>
        {page.sections.map((section) => (
          <article key={section.title}>
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
        <p className="small">{common.footerNote}</p>
      </section>
    </main>
  );
}
