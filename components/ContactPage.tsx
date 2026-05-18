"use client";

import Link from "next/link";
import { useAppSettings } from "@/components/AppSettings";
import { PnevmaMark } from "@/components/ToolIcons";
import { getLocale } from "@/locales";

export function ContactPage() {
  const { lang } = useAppSettings();
  const locale = getLocale(lang);
  const labels = locale.common;
  const legal = locale.legal;

  return (
    <main className="app contact-page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <PnevmaMark />
          </div>
          <div>
            <h1>{labels.contact}</h1>
            <p className="subhead">{labels.contactSubtitle}</p>
          </div>
        </div>
        <Link className="button secondary" href="/spot">
          {legal.backToTools}
        </Link>
      </header>

      <section className="contact-card">
        <div className="contact-identity">
          <div className="contact-avatar" aria-hidden="true">
            PM
          </div>
          <div className="contact-lines">
            <h2>{labels.contactName}</h2>
            <p>{labels.contactRole}</p>
            <p>{labels.contactPhone}</p>
            <div className="contact-links">
              <span>{labels.contactAddress}</span>
              <a href={`mailto:${labels.contactEmail}`}>{labels.contactEmail}</a>
              <a href={`https://${labels.contactWebsite}`} target="_blank" rel="noreferrer">
                {labels.contactWebsite}
              </a>
            </div>
          </div>
        </div>

        <div className="contact-logo-panel">
          <div className="contact-logo" aria-hidden="true">
            <PnevmaMark />
            <span>Pnevma</span>
          </div>
          <dl className="contact-data">
            <div>
              <dt>{labels.contactPhoneLabel}</dt>
              <dd>{labels.contactPhone}</dd>
            </div>
            <div>
              <dt>{labels.contactEmailLabel}</dt>
              <dd><a href={`mailto:${labels.contactEmail}`}>{labels.contactEmail}</a></dd>
            </div>
            <div>
              <dt>{labels.contactAddressLabel}</dt>
              <dd>{labels.contactAddress}</dd>
            </div>
            <div>
              <dt>{labels.contactWebsiteLabel}</dt>
              <dd><a href={`https://${labels.contactWebsite}`} target="_blank" rel="noreferrer">{labels.contactWebsite}</a></dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
