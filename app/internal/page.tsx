import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pnevma Internal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function InternalPage() {
  return (
    <main className="internal-route" aria-label="Pnevma internal protected pages">
      <iframe className="internal-route-frame" src="/protected-html/index.html" title="Pnevma internal protected pages" />
    </main>
  );
}
