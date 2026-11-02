import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Literata,
  Lora,
  Merriweather,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { PrefsApplier } from "@/components/notepad/prefs-applier";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// book fonts for the Settings menu — variable families with true italics
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudyPad — Notepad for Studies",
  description:
    "A local-first study notepad: organise subjects, chapters and notes. Write chemical equations and math formulas with LaTeX, rendered live.",
  keywords: ["study", "notepad", "notes", "chemistry", "equations", "LaTeX", "KaTeX"],
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.svg`,
  },
};

/**
 * Applies saved appearance prefs (font / text size) before first paint so a
 * reload doesn't flash the default font. Mirrors src/lib/prefs.ts — keep the
 * storage key and the "default means no attribute" rule in sync.
 */
const PREFS_BOOT = `try{var p=JSON.parse(localStorage.getItem('studypad-prefs-v1')||'{}').state||{};var d=document.documentElement;if(p.font&&p.font!=='default')d.setAttribute('data-app-font',p.font);if(p.noteSize&&p.noteSize!=='md')d.setAttribute('data-note-size',p.noteSize);}catch(e){}`;

const fontVars = [
  geistSans.variable,
  geistMono.variable,
  literata.variable,
  lora.variable,
  merriweather.variable,
  sourceSerif.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <body className="antialiased bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
        <ThemeProvider>
          <PrefsApplier />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
