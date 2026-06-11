"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSettings } from "@/components/AppSettings";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AxisIcon, KerfIcon, LaserCoachIcon, PnevmaMark, SpotIcon } from "@/components/ToolIcons";
import { UnitToggle } from "@/components/UnitToggle";
import { getLocale } from "@/locales";

function getTools(labels: Record<string, string>) {
  return [
  {
    href: "/spot",
    key: "spot",
    name: labels.spotToolName,
    meta: labels.spotToolMeta,
    icon: <SpotIcon />,
  },
  {
    href: "/axis",
    key: "axis",
    name: labels.axisToolName,
    meta: labels.axisToolMeta,
    icon: <AxisIcon />,
  },
  {
    href: "/kerf",
    key: "kerf",
    name: labels.kerfToolName,
    meta: labels.kerfToolMeta,
    icon: <KerfIcon />,
  },
  {
    href: "/lasercoach",
    key: "lasercoach",
    name: labels.laserCoachToolName || "Triple Factor Laser Coach",
    meta: labels.laserCoachToolMeta || "Machine, optics, vector, feedback",
    icon: <LaserCoachIcon />,
  },
  ];
}

export function Sidebar() {
  const pathname = usePathname();
  const { lang } = useAppSettings();
  const labels = getLocale(lang).common;
  const tools = getTools(labels);
  const active = pathname === "/" ? "/spot" : pathname;

  return (
    <aside className="sidebar" aria-label={labels.sidebarAria}>
      <div className="workspace-brand">
        <div className="brand-mark" aria-hidden="true">
          <PnevmaMark />
        </div>
        <div>
          <strong>{labels.appName}</strong>
        </div>
      </div>

      <nav className="tool-list" aria-label={labels.toolsAria}>
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
          <span className="control-label">{labels.language}</span>
          <LanguageToggle />
        </div>
        <div>
          <span className="control-label">{labels.theme}</span>
          <ThemeToggle />
        </div>
        <div>
          <span className="control-label">{labels.units}</span>
          <UnitToggle />
        </div>
      </div>

    </aside>
  );
}
