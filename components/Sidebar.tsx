"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnitToggle } from "@/components/UnitToggle";

const tools = [
  {
    href: "/spot",
    key: "spot",
    name: "CO2 Laser Spot Diameter",
    meta: "Lens, source, mirrors, losses, graphs",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 12h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/axis",
    key: "axis",
    name: "Axis Line Interval",
    meta: "Microsteps, DPI targets, spot overlap",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 17h16M4 12h16M4 7h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const active = pathname === "/" ? "/spot" : pathname;

  return (
    <aside className="sidebar" aria-label="Pnevma tools">
      <div className="workspace-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <path d="M10 43L32 10l22 43H10Z" fill="none" stroke="#f5b45b" strokeWidth="4" strokeLinejoin="round" />
            <path d="M21 40h22" stroke="#66a3ff" strokeWidth="5" strokeLinecap="round" />
            <circle cx="32" cy="32" r="4" fill="#ffffff" />
          </svg>
        </div>
        <div>
          <strong>Pnevma Tools</strong>
        </div>
      </div>

      <nav className="tool-list" aria-label="Tools">
        {tools.map((tool) => (
          <Link key={tool.key} className={`tool-button ${active === tool.href ? "active" : ""}`} href={tool.href}>
            <span className="tool-icon">{tool.icon}</span>
            <span>
              <span className="tool-name">{tool.name}</span>
              <span className="tool-meta">{tool.meta}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-controls">
        <div>
          <span className="control-label">Language</span>
          <LanguageToggle />
        </div>
        <div>
          <span className="control-label">Theme</span>
          <ThemeToggle />
        </div>
        <div>
          <span className="control-label">Units</span>
          <UnitToggle />
        </div>
      </div>

    </aside>
  );
}
