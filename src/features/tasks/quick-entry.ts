import { addDaysToKey, fromDateKey, isValidDateKey, toDateKey } from "@/lib/date";
import { courseTabLabel } from "@/features/courses/course-stationery";
import { normalizeTimeInput, parseDateInput } from "./task-date-input";
import type { TaskFormValues } from "./task-validation";

const relativeDays: Record<string, number> = {
  วันนี้: 0, พรุ่งนี้: 1, มะรืน: 2, มะรืนนี้: 2, today: 0, tomorrow: 1,
};
const weekdays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const thaiMonthNames = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
].join("|");
const fullThaiDates = new RegExp(
  String.raw`(?<![\p{N}\p{Script=Latin}_])[0-9๐-๙]{1,2}\s+(?:${thaiMonthNames})\s+` +
  String.raw`(?:(?:พ\.ศ\.|ค\.ศ\.|พุทธศักราช|คริสต์ศักราช)\s*)?[0-9๐-๙]{4}(?![\p{N}\p{Script=Latin}_])`,
  "gu",
);
const numbers = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ", "สิบเอ็ด"];
const hourWords = "(สิบเอ็ด|สิบ|เก้า|แปด|เจ็ด|หก|ห้า|สี่|สาม|สอง|หนึ่ง|\\d{1,2})";
type Found = { match: { index: number; 0: string }; value: string };

export interface QuickEntryDraft extends TaskFormValues {
  needsTimeReview: boolean;
  dateConflict:
    | { message: "dateConflict"; weekday: string; date: string }
    | { message: "multipleDates"; firstDate: string; secondDate: string }
    | { message: "thaiWrittenDate"; date: string }
    | { message: "unclearQuotes" }
    | null;
}

type TitlePart = { start: number; end: number; quoted: boolean };
const closingQuote: Record<string, string> = { '"': '"', "'": "'", "“": "”", "‘": "’" };
const wordCharacter = /[\p{L}\p{M}\p{N}]/u;
const thaiCharacter = /\p{Script=Thai}/u;

/** Return source offsets, or decline to extract fields when a quote boundary is unclear. */
function splitTitleQuotes(source: string): TitlePart[] | null {
  const parts: TitlePart[] = [];
  const closers: string[] = [];
  let start = 0;
  function finish(end: number, quoted: boolean) {
    if (end > start) parts.push({ start, end, quoted });
    start = end;
  }
  for (const { 0: token, index } of source.matchAll(/\\[\\'"“”‘’]|['"“”‘’]/gu)) {
    const char = token.at(-1)!;
    if (char === "\\") continue;
    const before = source[index - 1] ?? "";
    const after = source[index + token.length] ?? "";
    // Apostrophes in words such as don't are literal. Thai titles can touch both quote marks.
    const single = char === "'" || char === "’";
    if (single && wordCharacter.test(before) && wordCharacter.test(after) &&
        !thaiCharacter.test(before) && !thaiCharacter.test(after)) continue;
    if (token.length === 2) {
      if (!closers.length) return null;
      continue;
    }
    if (closers.length) {
      if (char === closers.at(-1)) {
        closers.pop();
        if (!closers.length) finish(index + 1, true);
      } else if (char === "“" || char === "‘") {
        closers.push(closingQuote[char]);
      }
      continue;
    }
    if (char === "”" || (char === "’" && (thaiCharacter.test(before) || thaiCharacter.test(after)))) return null;
    if (char === "’") continue;
    if (char === "'" && wordCharacter.test(before) && !wordCharacter.test(after)) continue;
    if (char === '"' && /\d/.test(before) && (!after || /\s/.test(after))) continue;
    finish(index, false);
    closers.push(closingQuote[char]);
  }
  if (closers.length) return null;
  finish(source.length, false);
  return parts;
}

function writtenDateKey(token: string): string | null {
  if (token.includes("/")) return parseDateInput(token);
  return isValidDateKey(token) ? token : null;
}

function readDate(
  text: string, source: string, today: Date, course?: Found["match"],
): { remaining: string; dueDate: string; dateConflict: QuickEntryDraft["dateConflict"] } {
  const dateTokens = /มะรืนนี้|มะรืน|พรุ่งนี้|วันนี้|วัน(อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัสบดี|ศุกร์|เสาร์)|\b(?:today|tomorrow)\b|(?<!\d)(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?!\d)/gi;
  const dateSource = course ? removeMatch(source, course) : source;
  const matches = [...dateSource.matchAll(dateTokens)];

  // Written dates can be a range or part of a title. Keep their wording for review.
  const [firstWritten, secondWritten] = matches.filter((match) => match[2]);
  if (secondWritten) {
    return {
      remaining: text, dueDate: "",
      dateConflict: { message: "multipleDates", firstDate: firstWritten[2], secondDate: secondWritten[2] },
    };
  }

  // Check the whole phrase as typed, excluding a day already inside a numeric date.
  const phraseSource = firstWritten ? removeMatch(source, firstWritten) : source;
  for (const match of phraseSource.matchAll(fullThaiDates)) {
    if (text.startsWith(match[0], match.index)) {
      return { remaining: text, dueDate: "", dateConflict: { message: "thaiWrittenDate", date: match[0] } };
    }
  }

  // Only unquoted tokens can supply or qualify a due date.
  const unquoted = matches.filter((match) => text.startsWith(match[0], match.index));
  const hasWrittenDate = unquoted.some((match) => match[2]);
  const [first, second, third] = unquoted.filter((match) => {
    if (!hasWrittenDate || !match[1]) return true;
    // Only a separate weekday qualifies a written date. Check the user's original spacing.
    const before = source[match.index - 1] ?? " ";
    const after = source[match.index + match[0].length] ?? " ";
    return /\s/u.test(before) && /\s/u.test(after);
  });
  if (!first) return { remaining: text, dueDate: "", dateConflict: null };
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
  return text.slice(0, index) + " ".repeat(token.length) + text.slice(index + token.length);
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
  const source = sentence.trim();
  const parts = splitTitleQuotes(source);
  if (!parts) {
    return {
      title: sentence, description: "", category: "", eventType: "task", dueDate: "", dueTime: "",
      needsTimeReview: false, dateConflict: { message: "unclearQuotes" },
    };
  }
  // Keep UTF-16 offsets aligned with the source. A quote also separates adjacent words and times.
  let text = parts.map(({ start, end, quoted }) => quoted ? "\uFFFC".repeat(end - start) : source.slice(start, end)).join("");
  const category = readCourse(text, categories);
  if (category) text = removeMatch(text, category.match);
  const date = readDate(text, source, now, category?.match);
  text = date.remaining;
  const time = readTime(text);
  const vague = time ? null : vagueTime.exec(text);
  if (time) {
    const prefix = timePrefix.exec(text.slice(0, time.match.index));
    text = removeMatch(text, time.match);
    if (prefix) text = removeMatch(text, prefix);
  } else if (vague) {
    text = removeMatch(text, vague);
  }
  const title = parts.map(({ start, end, quoted }) =>
    quoted ? source.slice(start, end) : text.slice(start, end).replace(/\s+/g, " "),
  ).join("").trim();
  return {
    dateConflict: date.dateConflict,
    needsTimeReview: Boolean(vague),
    title, description: "", category: category?.value ?? "",
    eventType: "task", dueDate: date.dueDate, dueTime: time?.value ?? "",
  };
}
