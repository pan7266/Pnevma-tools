import type { Metadata } from "next";
import { TOOL_DOCS } from "@/lib/data/tool-docs";

export const metadata: Metadata = {
  title: "Tool Descriptions",
  description: "Everyday explanations for the Pnevma Tools laser calculators.",
};

export default function ToolDocsIndexPage() {
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div>
            <h1>Tool Descriptions</h1>
          </div>
        </div>
      </header>
      <section className="panel panel-pad docs-grid">
        {TOOL_DOCS.map((doc) => (
          <article className="mini-panel docs-card" key={doc.slug}>
            <h2>{doc.title}</h2>
            <p>{doc.summary}</p>
            <div className="button-row">
              <a className="button secondary" href={`/docs/${doc.slug}`}>Read description</a>
              <a className="button secondary" href={doc.href}>Open tool</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
