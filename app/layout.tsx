import type { Metadata } from "next";
import { Workspace } from "@/components/Workspace";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pnevmatools.gr"),
  title: "Pnevma Tools",
  description: "CO2 laser calculators and QR scanning tools for practical workshop checks.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Workspace>{children}</Workspace>
      </body>
    </html>
  );
}
