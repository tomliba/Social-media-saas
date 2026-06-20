import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["400", "500", "600", "700", "800"],
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

// Self-hosted Material Symbols icon font (variable: FILL + wght axes). Served
// from our own origin so icons never depend on a remote Google Fonts request or
// a fragile media-swap. `display: "block"` means an icon renders as its glyph or
// stays briefly invisible — it never falls back to showing the raw ligature
// name. The .material-symbols-outlined class is defined in globals.css and
// points at this font via the CSS variable below.
const materialSymbols = localFont({
  src: "./fonts/MaterialSymbolsOutlined.woff2",
  variable: "--font-material-symbols",
  display: "block",
  weight: "100 700",
});

export const metadata: Metadata = {
  title: "Fluvio | Make a week of content before lunch",
  description:
    "AI short-form video creation for creators. Pick a template. AI writes the script. Choose your character. Get a finished video in 2 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${plusJakarta.variable} ${beVietnam.variable} ${materialSymbols.variable} bg-surface font-body text-on-surface antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
