import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { LanguageCode, Translations } from "../i18n/translations";
import translations, { LANGUAGES } from "../i18n/translations";

const STORAGE_KEY = "hklo_preferred_language";

function isValidLanguageCode(code: string): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}

function getInitialLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLanguageCode(stored)) return stored;
  } catch {
    // ignore
  }
  return "sv";
}

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] =
    useState<LanguageCode>(getInitialLanguage);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}

export { STORAGE_KEY as LANGUAGE_STORAGE_KEY };
