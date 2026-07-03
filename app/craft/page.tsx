import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pnevma Craft Access",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function CraftPage() {
  return (
    <section className="craft-route" aria-label="Pnevma Craft protected access">
      <iframe className="craft-route-frame" src="/craft/index.html" title="Pnevma Craft access" />
    </section>
  );
}
