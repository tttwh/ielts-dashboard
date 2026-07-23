import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { translations, type I18nText, type Language } from "./translations";

const storageKey = "ielts-dashboard-language";
const fallbackLanguage: Language = "en";

interface I18nContextValue {
  language: Language;
  setLanguage(language: Language): void;
  t: I18nText;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const isLanguage = (value: string | null): value is Language => value === "en" || value === "zh";

const readInitialLanguage = (): Language => {
  if (typeof window === "undefined") return fallbackLanguage;

  const storedLanguage = window.localStorage.getItem(storageKey);
  return isLanguage(storedLanguage) ? storedLanguage : fallbackLanguage;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: translations[language]
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return context;
}

export const languageStorageKey = storageKey;
