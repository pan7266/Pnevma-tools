"use client";

import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSettingsProvider, useAppSettings } from "@/components/AppSettings";
import { Sidebar } from "@/components/Sidebar";
import { getLocale } from "@/locales";

export function Workspace({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AppSettingsProvider>
  );
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const { lang } = useAppSettings();
  const pathname = usePathname();
  const labels = getLocale(lang).common;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname?.startsWith("/craft") || pathname?.startsWith("/internal")) {
    return <>{children}</>;
  }

  function closeSidebarFromClick(event: MouseEvent<HTMLDivElement>) {
    if (!sidebarOpen) return;
    const target = event.target as HTMLElement;
    if (target.closest(".sidebar-controls")) return;
    setSidebarOpen(false);
  }

  return (
    <>
      <header className="mobile-bar">
        <button className="mobile-menu-toggle" type="button" aria-label={labels.openNavigation} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}>
          <span />
          <span />
          <span />
        </button>
        <strong>{labels.appName}</strong>
      </header>
      <input className="sidebar-toggle-input" id="sidebarToggle" type="checkbox" aria-hidden="true" checked={sidebarOpen} onChange={(event) => setSidebarOpen(event.target.checked)} />
      <div className="workspace" onClick={closeSidebarFromClick}>
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
