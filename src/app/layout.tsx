import type { Metadata } from "next";
import { JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import NavShell from "@/components/nav/NavShell";
import Preloader from "@/components/fx/Preloader";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sambit Ghosh — Backend / Platform Engineer",
  description:
    "An interactive backend-system simulator. Most portfolios tell you what someone knows — this one lets you break it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg font-sans text-foreground">
        <Preloader />
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
