import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Pnevma Product QA",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const dynamic = "force-static";

type QaDocument = {
  styles: string[];
  body: string;
  scripts: string[];
};

const qaHtmlPath = join(process.cwd(), "app", "internal", "pnevma-product-qa-checklist.html");
const qaDataPath = join(process.cwd(), "app", "internal", "pnevma-product-qa-data.js");

function getQaDocument(): QaDocument {
  const dataScript = readFileSync(qaDataPath, "utf8");
  const sourceHtml = readFileSync(qaHtmlPath, "utf8").replace(
    /\s*<script\s+src=["']pnevma-product-qa-data\.js["']\s*><\/script>/i,
    `\n<script>\n${dataScript}\n</script>`,
  );
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(sourceHtml)?.[1] ?? sourceHtml;

  return {
    styles: [...sourceHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]),
    body: body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").trim(),
    scripts: [...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]),
  };
}

export default function InternalPage() {
  const document = getQaDocument();

  return (
    <>
      {document.styles.map((style, index) => (
        <style key={`qa-style-${index}`} dangerouslySetInnerHTML={{ __html: style }} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: document.body }} />
      {document.scripts.map((script, index) => (
        <Script id={`qa-script-${index}`} key={`qa-script-${index}`} strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: script }} />
      ))}
    </>
  );
}
