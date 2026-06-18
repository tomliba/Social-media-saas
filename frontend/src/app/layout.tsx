import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
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
      <head>
        {/* Warm up the Google Fonts connections before the icon stylesheet is
            requested, so the TLS/DNS handshake isn't on the critical path. This
            shaves the connection setup (often 100-300ms) off first paint. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Non-blocking load of the Material Symbols icon stylesheet: fetched at
            low priority via media="print", then promoted to apply once it has
            downloaded (and immediately if it was already cached). Falls back to
            a plain stylesheet when JS is disabled. */}
        {/* The inline script below flips media "print" → "all" once the sheet
            loads, so the client DOM intentionally diverges from the SSR markup.
            suppressHydrationWarning stops React from warning about (and
            reverting) that expected attribute difference. */}
        <link
          id="ms-icons"
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          media="print"
          suppressHydrationWarning
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var l=document.getElementById('ms-icons');if(l){l.onload=function(){this.media='all'};if(l.sheet)l.media='all';}",
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          />
        </noscript>
      </head>
      <body
        className={`${plusJakarta.variable} ${beVietnam.variable} bg-surface font-body text-on-surface antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
