"use client";

import { AppSettingsProvider, useAppSettings } from "@/components/AppSettings";
import { Sidebar } from "@/components/Sidebar";
import { getLocale } from "@/locales";

export function Workspace({ children }: { children: React.ReactNode }) {
  return (
    <AppSettingsProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AppSettingsProvider>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { lang } = useAppSettings();
  const labels = getLocale(lang).common;
  return (
    <>
      <header className="mobile-bar">
        <label className="mobile-menu-toggle" htmlFor="sidebarToggle" aria-label={labels.openNavigation}>
          <span />
          <span />
          <span />
        </label>
        <strong>{labels.appName}</strong>
      </header>
      <input className="sidebar-toggle-input" id="sidebarToggle" type="checkbox" aria-hidden="true" />
      <div className="workspace">
        <Sidebar />
        <section className="tool-shell">
          {children}
          <footer className="app-footer">
            <a href="/privacy">{labels.privacyPolicy}</a>
            <a href="/terms">{labels.terms}</a>
            <a href="/contact">{labels.contact}</a>
            <span>{labels.footerNote}</span>
          </footer>
        </section>
      </div>
    </>
  );
}
