import type { Metadata } from "next";
import { QrScanner } from "@/components/QrScanner";

export const metadata: Metadata = {
  title: "QR Code Scanner | Pnevma Tools",
  description: "Scan QR codes from camera, image upload, or clipboard and safely extract links, text, Wi-Fi, email, SMS, and contact details.",
  openGraph: {
    title: "QR Code Scanner | Pnevma Tools",
    description: "Camera, upload, and clipboard QR scanning in the Pnevma Tools interface.",
    type: "website",
    images: [
      {
        url: "/qr-scanner-og.svg",
        width: 1200,
        height: 630,
        alt: "QR Code Scanner by Pnevma Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Code Scanner | Pnevma Tools",
    description: "Camera, upload, and clipboard QR scanning in the Pnevma Tools interface.",
    images: ["/qr-scanner-og.svg"],
  },
};

export default function QrPage() {
  return <QrScanner />;
}
