import {
  getTranslations,
  interpolate,
  type Locale,
} from "@/i18n/translations";

export const SUPPORTED_LOCALES = ["en", "th"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "taskflow.locale";

export const localeMetadata: Record<
  Locale,
  {
    label: string;
    shortLabel: string;
    languageTag: string;
    documentLanguage: string;
    direction: "ltr";
  }
> = {
  en: {
    label: "English",
    shortLabel: "EN",
    languageTag: "en-US",
    documentLanguage: "en",
    direction: "ltr",
  },
  th: {
    label: "ไทย",
    shortLabel: "TH",
    languageTag: "th-TH-u-ca-gregory",
    documentLanguage: "th",
    direction: "ltr",
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.toLowerCase().split("-")[0];
  return isLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

function getBrowserStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) {
    return storage;
  }

  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredLocale(storage?: Storage | null): Locale {
  const target = getBrowserStorage(storage);
  if (!target) {
    return DEFAULT_LOCALE;
  }

  try {
    return normalizeLocale(target.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function persistLocale(
  locale: Locale,
  storage?: Storage | null,
): void {
  const target = getBrowserStorage(storage);
  if (!target) {
    return;
  }

  try {
    target.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Language switching should still work if browser storage is blocked.
  }
}

export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = localeMetadata[locale].documentLanguage;
  document.documentElement.dir = localeMetadata[locale].direction;
}

function parseDate(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value);
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      12,
    );
  }

  return new Date(value);
}

function atLocalNoon(value: Date): Date {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function getCalendarDayOffset(
  value: Date | string,
  from = new Date(),
): number {
  const target = atLocalNoon(parseDate(value));
  const origin = atLocalNoon(from);
  return Math.round((target.getTime() - origin.getTime()) / 86_400_000);
}

export function formatDate(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  },
): string {
  return new Intl.DateTimeFormat(localeMetadata[locale].languageTag, options).format(
    parseDate(value),
  );
}

export function formatRelativeDate(
  value: Date | string,
  locale: Locale,
  from = new Date(),
): string {
  const offset = getCalendarDayOffset(value, from);
  const copy = getTranslations(locale).date;

  if (offset === -1) return copy.yesterday;
  if (offset === 0) return copy.today;
  if (offset === 1) return copy.tomorrow;
  return formatDate(value, locale);
}

export function formatTime(value: string, locale: Locale): string {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat(localeMetadata[locale].languageTag, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMetadata[locale].languageTag).format(value);
}

export function formatTaskCount(count: number, locale: Locale): string {
  const copy = getTranslations(locale).task;
  return count === 1
    ? copy.countOne
    : interpolate(copy.count, { count: formatNumber(count, locale) });
}

export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function getGreetingPeriod(now = new Date()): GreetingPeriod {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
