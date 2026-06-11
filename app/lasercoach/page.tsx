import type { Metadata } from "next";
import { LaserCoach } from "@/components/LaserCoach";

const description = "Machine-specific laser cutting and engraving recommendations from optics, motion limits, vector geometry, and feedback.";

export const metadata: Metadata = {
  title: "Triple Factor Laser Coach",
  description,
  alternates: {
    canonical: "/lasercoach",
  },
  openGraph: {
    title: "Triple Factor Laser Coach | Pnevma Tools",
    description,
    url: "/lasercoach",
    siteName: "Pnevma Tools",
    type: "website",
    images: [
      {
        url: "/lasercoach/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Triple Factor Laser Coach by Pnevma Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Triple Factor Laser Coach | Pnevma Tools",
    description,
    images: ["/lasercoach/opengraph-image"],
  },
};

export default function LaserCoachPage() {
  return <LaserCoach />;
}
