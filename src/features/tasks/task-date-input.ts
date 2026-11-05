import { isValidDateKey } from "@/lib/date";

/** Display only: persistence continues to use YYYY-MM-DD and HH:mm. */
export function formatDateInput(dateKey: string): string {
  if (!isValidDateKey(dateKey)) return "";
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}

export function parseDateInput(value: string): string | null {
  const text = value.trim().replace(/^(\d{2})(\d{2})(\d{4})$/, "$1/$2/$3");
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match;
  const key = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
}

export function normalizeTimeInput(value: string): string {
  const text = value.trim().replace(/^(\d{1,2})(\d{2})$/, "$1:$2");
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : text;
}
