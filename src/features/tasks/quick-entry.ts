import { addDaysToKey, isValidDateKey, toDateKey } from "@/lib/date";
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

function readDate(text: string, today: Date): Found | null {
  const match = /มะรืนนี้|มะรืน|พรุ่งนี้|วันนี้|วัน(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์)|\b(?:today|tomorrow)\b|(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)|(?<!\d)\d{1,2}\/\d{1,2}\/\d{4}(?!\d)/i.exec(text);
  if (!match) return null;
  const token = match[0].toLowerCase();
  let date: string | null;
  if (match[1]) {
    date = addDaysToKey(toDateKey(today), (weekdays.indexOf(match[1]) - today.getDay() + 7) % 7);
  } else if (Object.hasOwn(relativeDays, token)) {
    date = addDaysToKey(toDateKey(today), relativeDays[token]);
  } else {
    date = token.includes("/") ? parseDateInput(token) : isValidDateKey(token) ? token : null;
  }
  return date ? { match, value: date } : null;
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

function removeMatch(text: string, found: Found | null) {
  if (!found) return text;
  const { index, 0: token } = found.match;
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
export function parseQuickEntry(sentence: string, categories: readonly string[], now: Date): TaskFormValues & { needsTimeReview: boolean } {
  let text = sentence.trim();
  const category = readCourse(text, categories);
  text = removeMatch(text, category);
  const date = readDate(text, now);
  text = removeMatch(text, date);
  const time = readTime(text);
  const vague = time ? null : vagueTime.exec(text);
  if (time) {
    text = text.slice(0, time.match.index).replace(timePrefix, "") + " " + text.slice(time.match.index + time.match[0].length);
  } else if (vague) {
    text = text.slice(0, vague.index);
  }
  return {
    needsTimeReview: Boolean(vague),
    title: text.replace(/\s+/g, " ").trim(), description: "", category: category?.value ?? "",
    eventType: "task", dueDate: date?.value ?? "", dueTime: time?.value ?? "",
  };
}
