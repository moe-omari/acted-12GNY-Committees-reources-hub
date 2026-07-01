import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { LanguageProvider } from "@/components/language-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Site Committee Resource Hub",
  description:
    "Bilingual resource hub and admin panel for site management committees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        {/* Reads stored language preference before React hydrates to avoid layout flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('site-hub-lang');if(s==='en'||s==='ar'){document.documentElement.lang=s;document.documentElement.dir=s==='ar'?'rtl':'ltr';}}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <AppHeader />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
