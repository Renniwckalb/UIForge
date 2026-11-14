import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALE_TAGS } from "@/i18n/core";
import { LocaleProvider } from "@/i18n/react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Polices du préréglage Beautiful UI (SIL OFL 1.1), exposées en variables pour l'aperçu des composants
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UI Forge",
  description: "Visual studio to build, configure and export reusable React components.",
};

/** Attribut lang corrigé avant le premier rendu (la coquille HTML est pré-rendue en anglais) */
const LANG_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(\\w+)/),t=${JSON.stringify(LOCALE_TAGS)};if(m&&t[m[1]])document.documentElement.lang=t[m[1]]}catch(e){}`;

/** Langue choisie (cookie) : lue à la requête, l'interface est rendue directement dans cette langue */
async function LocaleRoot({ children }: { children: React.ReactNode }) {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return <LocaleProvider initialLocale={isLocale(value) ? value : DEFAULT_LOCALE}>{children}</LocaleProvider>;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={LOCALE_TAGS[DEFAULT_LOCALE]}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <LocaleRoot>
            <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
          </LocaleRoot>
        </Suspense>
        <Toaster theme="light" position="bottom-right" />
      </body>
    </html>
  );
}
