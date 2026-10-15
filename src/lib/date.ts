import type { Locale } from "@/i18n";
import { localeMetadata } from "@/i18n";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value: string): Date {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return new Date(Number.NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

export function isValidDateKey(value: string): boolean {
  const date = fromDateKey(value);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

export function addDaysToKey(value: string, amount: number): string {
  const date = fromDateKey(value);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function getDayDifference(value: string, today = new Date()): number {
  const target = fromDateKey(value);
  const start = new Date(today);
  start.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function formatLongDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMetadata[locale].languageTag, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatCompactDate(dateKey: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeMetadata[locale].languageTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(fromDateKey(dateKey));
}

export function formatClockTime(time: string, locale: Locale): string {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(2020, 0, 1, hour, minute);
  return new Intl.DateTimeFormat(localeMetadata[locale].languageTag, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
