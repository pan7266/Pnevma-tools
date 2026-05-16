"use client";

import { AppSettingsProvider } from "@/components/AppSettings";
import { Sidebar } from "@/components/Sidebar";

export function Workspace({ children }: { children: React.ReactNode }) {
  return (
    <AppSettingsProvider>
      <header className="mobile-bar">
        <label className="mobile-menu-toggle" htmlFor="sidebarToggle" aria-label="Open navigation">
          <span />
          <span />
          <span />
        </label>
        <strong>Pnevma Tools</strong>
      </header>
      <input className="sidebar-toggle-input" id="sidebarToggle" type="checkbox" aria-hidden="true" />
      <div className="workspace">
        <Sidebar />
        <section className="tool-shell">
          {children}
          <footer className="app-footer">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms</a>
            <span>Engineering estimates only. Verify settings on the real machine.</span>
          </footer>
        </section>
      </div>
    </AppSettingsProvider>
  );
}
