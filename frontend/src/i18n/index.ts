import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./messages/en.json";
import ru from "./messages/ru.json";
import uz from "./messages/uz.json";

export const SUPPORTED_LANGS = ["uz", "ru", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<SupportedLang, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ru: { translation: ru },
        uz: { translation: uz },
      },
      // Deliberately NOT using LanguageDetector for the initial language. This app is
      // server-rendered (TanStack Start) — localStorage/cookies aren't available on the
      // server, so if the detector picked the language up front, the server would render one
      // language and the client's first paint could pick a different one (it reads
      // localStorage before React even starts hydrating), causing a hydration mismatch.
      // Server and client now both start on the same fixed language; the real stored
      // preference is applied client-side after mount — see the LanguageSync effect in
      // routes/__root.tsx, which calls i18n.changeLanguage() post-hydration instead.
      lng: "uz",
      fallbackLng: "uz",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
    });
}

/** Reads the user's stored language preference — same lookup order the old LanguageDetector used. */
export function detectStoredLang(): SupportedLang {
  if (typeof window === "undefined") return "uz";
  try {
    const fromStorage = window.localStorage.getItem("edu-crm-lang");
    if (fromStorage && (SUPPORTED_LANGS as readonly string[]).includes(fromStorage)) {
      return fromStorage as SupportedLang;
    }
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
  try {
    const match = document.cookie.match(/(?:^|; )edu-crm-lang=([^;]+)/);
    if (match && (SUPPORTED_LANGS as readonly string[]).includes(match[1])) {
      return match[1] as SupportedLang;
    }
  } catch {
    // ignore
  }
  const nav = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : undefined;
  if (nav && (SUPPORTED_LANGS as readonly string[]).includes(nav)) {
    return nav as SupportedLang;
  }
  return "uz";
}

export default i18n;
