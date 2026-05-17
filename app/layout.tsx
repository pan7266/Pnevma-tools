import type { Metadata } from "next";
import { Workspace } from "@/components/Workspace";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Pnevma Tools",
  description: "CO2 laser spot and axis line interval calculators.",
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
