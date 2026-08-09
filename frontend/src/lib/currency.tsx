import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Currency = "UZS" | "USD" | "RUB";

export const CURRENCIES: Currency[] = ["UZS", "USD", "RUB"];

/**
 * The backend stores every amount in UZS (so'm) and has no live FX endpoint, so these are fixed
 * reference rates for DISPLAY conversion only — not tied to a real-time source. Update them here
 * if they drift too far from reality; nothing else needs to change.
 */
const RATE_TO_UZS: Record<Currency, number> = {
  UZS: 1,
  USD: 12700,
  RUB: 135,
};

export function convertFromUzs(amountUzs: number, to: Currency): number {
  return amountUzs / RATE_TO_UZS[to];
}

const CURRENCY_LOCALE: Record<Currency, string> = {
  UZS: "uz-UZ",
  USD: "en-US",
  RUB: "ru-RU",
};

const CURRENCY_SUFFIX: Record<Currency, string> = {
  UZS: "so'm",
  USD: "$",
  RUB: "₽",
};

/** Formats a UZS amount in the given display currency, e.g. formatMoney(500000, "USD") -> "$39.37". */
export function formatMoney(amountUzs: number, currency: Currency = "UZS"): string {
  const value = convertFromUzs(amountUzs, currency);
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
    minimumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value);
  return currency === "USD" ? `${CURRENCY_SUFFIX[currency]}${formatted}` : `${formatted} ${CURRENCY_SUFFIX[currency]}`;
}

const STORAGE_KEY = "edu-crm-currency";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (amountUzs: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Must start identical on server and client (see the matching comment in lib/theme.ts) — the
  // server never has localStorage, so it always renders "UZS"; starting client state at the
  // real saved currency would make the first client render disagree with the server's HTML for
  // every formatted amount on the page, triggering a hydration mismatch (React error #418).
  const [currency, setCurrencyState] = useState<Currency>("UZS");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "USD" || stored === "RUB" || stored === "UZS") setCurrencyState(stored);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }, [currency]);

  const setCurrency = useCallback((c: Currency) => setCurrencyState(c), []);
  const format = useCallback((amountUzs: number) => formatMoney(amountUzs, currency), [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

/** Reads/writes the app-wide display currency (UZS/USD/RUB) — amounts stay stored in UZS. */
export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
