import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolDoc, TOOL_DOCS } from "@/lib/data/tool-docs";

interface ToolDocPageProps {
  params: Promise<{ tool: string }>;
}

export function generateStaticParams() {
  return TOOL_DOCS.map((doc) => ({ tool: doc.slug }));
}

export async function generateMetadata({ params }: ToolDocPageProps): Promise<Metadata> {
  const { tool } = await params;
  const doc = getToolDoc(tool);
  if (!doc) return {};
  return {
    title: `${doc.title} Description`,
    description: doc.summary,
  };
}

function DocList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mini-panel docs-section">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

export default async function ToolDocPage({ params }: ToolDocPageProps) {
  const { tool } = await params;
  const doc = getToolDoc(tool);
  if (!doc) notFound();

  return (
    <main className="app docs-page">
      <header className="topbar">
        <div className="brand">
          <div>
            <h1>{doc.title}</h1>
          </div>
        </div>
        <a className="tool-doc-link" href={doc.href}>Open tool</a>
      </header>

      <section className="panel panel-pad stack docs-intro">
        <p>{doc.summary}</p>
      </section>

      <section className="docs-grid">
        <DocList title="What it solves" items={doc.solves} />
        <DocList title="What you enter" items={doc.inputs} />
        <DocList title="What you get" items={doc.outputs} />
        <DocList title="How to use it day to day" items={doc.everydayUse} />
        <DocList title="Limits" items={doc.limits} />
      </section>
    </main>
  );
}
