"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Language = "en" | "ar";

type LanguageContextValue = {
  lang: Language;
  isArabic: boolean;
  setLang: (next: Language) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "site-hub-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to Arabic. An inline script in layout.tsx applies the stored preference
  // before hydration so there is no layout flash. This useState must match the
  // server-rendered default ("ar") to avoid a hydration mismatch.
  const [lang, setLangState] = useState<Language>("ar");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      isArabic: lang === "ar",
      setLang: setLangState,
      toggleLang: () => setLangState((current) => (current === "ar" ? "en" : "ar")),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
