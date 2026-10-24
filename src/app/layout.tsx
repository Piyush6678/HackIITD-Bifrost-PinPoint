import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Lato, Source_Serif_4 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
});

const sans = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "PinPoint · Report, track and resolve civic issues",
    template: "%s · PinPoint",
  },
  description:
    "One public map for every civic problem in the city. Report once, see who else reported it, and watch it get fixed.",
};

export const viewport: Viewport = {
  themeColor: "#0b4f4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
