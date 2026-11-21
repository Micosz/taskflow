import { addDaysToKey, fromDateKey, isValidDateKey, toDateKey } from "@/lib/date";
import { courseTabLabel } from "@/features/courses/course-stationery";
import { normalizeTimeInput, parseDateInput } from "./task-date-input";
import type { TaskFormValues } from "./task-validation";

const relativeDays: Record<string, number> = {
  วันนี้: 0, พรุ่งนี้: 1, มะรืน: 2, มะรืนนี้: 2, today: 0, tomorrow: 1,
};
const weekdays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const numbers = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ", "สิบเอ็ด"];
const hourWords = "(สิบเอ็ด|สิบ|เก้า|แปด|เจ็ด|หก|ห้า|สี่|สาม|สอง|หนึ่ง|\\d{1,2})";
type Found = { match: { index: number; 0: string }; value: string };

export interface QuickEntryDraft extends TaskFormValues {
  needsTimeReview: boolean;
  dateConflict:
    | { message: "dateConflict"; weekday: string; date: string }
    | { message: "multipleDates"; firstDate: string; secondDate: string }
    | null;
}

function writtenDateKey(token: string): string | null {
  if (token.includes("/")) return parseDateInput(token);
  return isValidDateKey(token) ? token : null;
}

function readDate(text: string, today: Date): { remaining: string; dueDate: string; dateConflict: QuickEntryDraft["dateConflict"] } {
  const dateTokens = /มะรืนนี้|มะรืน|พรุ่งนี้|วันนี้|วัน(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์)|\b(?:today|tomorrow)\b|(?<!\d)(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?!\d)/gi;
  const matches = [...text.matchAll(dateTokens)];
  const [first, second, third] = matches;
  if (!first) return { remaining: text, dueDate: "", dateConflict: null };

  // Written dates can be a range or part of a title. Keep their wording for review.
  const [firstWritten, secondWritten] = matches.filter((match) => match[2]);
  if (secondWritten) {
    return {
      remaining: text, dueDate: "",
      dateConflict: { message: "multipleDates", firstDate: firstWritten[2], secondDate: secondWritten[2] },
    };
  }

  // A weekday can qualify a written date several weeks away.
  if (second && !third) {
    const weekday = first[1] || second[1];
    const written = first[2] || second[2];
    if (weekday && written) {
      const dueDate = writtenDateKey(written);
      const agrees = dueDate && fromDateKey(dueDate).getDay() === weekdays.indexOf(weekday);
      return {
        remaining: removeMatch(removeMatch(text, second), first),
        dueDate: dueDate ?? "",
        dateConflict: agrees ? null : { message: "dateConflict", weekday: "วัน" + weekday, date: written },
      };
    }
  }

  const token = first[0].toLowerCase();
  let dueDate: string | null;
  if (first[1]) {
    dueDate = addDaysToKey(toDateKey(today), (weekdays.indexOf(first[1]) - today.getDay() + 7) % 7);
  } else if (Object.hasOwn(relativeDays, token)) {
    dueDate = addDaysToKey(toDateKey(today), relativeDays[token]);
  } else {
    dueDate = writtenDateKey(token);
  }
  return { remaining: dueDate ? removeMatch(text, first) : text, dueDate: dueDate ?? "", dateConflict: null };
}

const spokenTimes = [
  { regex: /เที่ยงคืน/, hour: () => 0 },
  { regex: /เที่ยง(?:วัน)?/, hour: () => 12 },
  { regex: /บ่ายโมง/, hour: () => 13 },
  { regex: new RegExp("บ่าย\\s*" + hourWords + "(?:\\s*โมง)?"), hour: (n: number) => n >= 1 && n <= 5 ? n + 12 : null },
  { regex: new RegExp(hourWords + "\\s*โมงเย็น"), hour: (n: number) => n >= 1 && n <= 6 ? n + 12 : null },
  { regex: new RegExp(hourWords + "\\s*โมงเช้า"), hour: (n: number) => n >= 6 && n <= 11 ? n : null },
  { regex: new RegExp(hourWords + "\\s*ทุ่ม"), hour: (n: number) => n >= 1 && n <= 5 ? n + 18 : null },
  { regex: new RegExp("ตี\\s*" + hourWords), hour: (n: number) => n >= 1 && n <= 5 ? n : null },
];

function readTime(text: string): Found | null {
  const clock = /(?<![\d:])(\d{1,2}:\d{2})(?![\d:])(?:\s*น\.)?/.exec(text);
  if (clock) return { match: clock, value: normalizeTimeInput(clock[1]) };
  for (const { regex, hour } of spokenTimes) {
    const match = regex.exec(text);
    if (!match) continue;
    const value = hour(/^\d+$/.test(match[1]) ? Number(match[1]) : numbers.indexOf(match[1]));
    if (value === null) continue;
    const half = /^\s*ครึ่ง/.exec(text.slice(match.index + match[0].length));
    return {
      match: { index: match.index, 0: match[0] + (half?.[0] ?? "") },
      value: String(value).padStart(2, "0") + (half ? ":30" : ":00"),
    };
  }
  return null;
}

const vagueTime = /(?:^|\s)(?:(?:ตอน|ช่วง)\s*)?(?:เช้า|สาย|บ่าย|เย็น|ค่ำ|ดึก)(?:\s*ๆ)?\s*$/;
const timePrefix = /(?:ตอน|เวลา)\s*$/;

function removeMatch(text: string, { index, 0: token }: Found["match"]) {
  return text.slice(0, index) + " " + text.slice(index + token.length);
}

function readCourse(text: string, categories: readonly string[]): Found | null {
  const code = /(?<![A-Za-z0-9])([A-Za-z]{2,8}-?\d{2,4})(?![A-Za-z0-9])/.exec(text);
  if (code) {
    const normalize = (s: string) => s.replace(/[- ]/g, "").toUpperCase();
    const category = categories.find((c) => normalize(courseTabLabel(c)) === normalize(code[1]));
    return { match: code, value: category ?? code[1].toUpperCase() };
  }
  // Free-form course names should be separate phrases, not parts of other words.
  for (const category of [...categories].sort((a, b) => b.length - a.length)) {
    const name = courseTabLabel(category);
    if (!name) continue;
    const escaped = name.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
    const match = new RegExp("(?<!\\S)" + escaped + "(?!\\S)", "iu").exec(text);
    if (match) return { match, value: category };
  }
  return null;
}

/** Leave missing fields empty so the normal form can complete the draft. */
export function parseQuickEntry(sentence: string, categories: readonly string[], now: Date): QuickEntryDraft {
  let text = sentence.trim();
  const category = readCourse(text, categories);
  if (category) text = removeMatch(text, category.match);
  const date = readDate(text, now);
  text = date.remaining;
  const time = readTime(text);
  const vague = time ? null : vagueTime.exec(text);
  if (time) {
    text = text.slice(0, time.match.index).replace(timePrefix, "") + " " + text.slice(time.match.index + time.match[0].length);
  } else if (vague) {
    text = text.slice(0, vague.index);
  }
  return {
    dateConflict: date.dateConflict,
    needsTimeReview: Boolean(vague),
    title: text.replace(/\s+/g, " ").trim(), description: "", category: category?.value ?? "",
    eventType: "task", dueDate: date.dueDate, dueTime: time?.value ?? "",
  };
}
