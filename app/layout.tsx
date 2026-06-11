import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Workspace } from "@/components/Workspace";
import "@/styles/globals.css";

const siteUrl = new URL("https://pnevmatools.gr");
const openSans = Open_Sans({
  subsets: ["latin", "latin-ext", "greek"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Pnevma Tools",
  title: {
    default: "Pnevma Tools",
    template: "%s | Pnevma Tools",
  },
  description: "CO2 laser spot, axis, kerf, and Triple Factor Laser Coach recommendation tools.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Pnevma Tools",
    description: "CO2 laser spot, axis, kerf, and laser recommendation tools.",
    siteName: "Pnevma Tools",
    url: siteUrl,
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={openSans.variable}>
        <Workspace>{children}</Workspace>
      </body>
    </html>
  );
}
