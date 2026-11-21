import { describe, expect, it } from "vitest";
import { parseQuickEntry } from "@/features/tasks/quick-entry";
import { toCreateTaskInput, validateTaskForm } from "@/features/tasks/task-validation";
import { courseInk } from "@/features/courses/course-stationery";

const courses = ["CS264 — Software Security", "Design studio", "C++"];
const saturday = new Date(2026, 10, 21, 23, 55);
const parse = (text: string) => parseQuickEntry(text, courses, saturday);

describe("one-line notebook entries", () => {
  it("uses the saved course label and the browser's local tomorrow", () => {
    expect(parse("ส่งแลบ cs264 พรุ่งนี้บ่ายสอง")).toMatchObject({
      title: "ส่งแลบ", category: courses[0], dueDate: "2026-11-22", dueTime: "14:00",
    });
  });
  it.each([
    ["เที่ยงคืน", "00:00"], ["เที่ยงครึ่ง", "12:30"], ["บ่ายโมง", "13:00"],
    ["สี่โมงเย็น", "16:00"], ["สามทุ่ม", "21:00"], ["ตีสอง", "02:00"], ["9:05", "09:05"],
  ])("reads %s", (clock, expected) => expect(parse("จด CS264 วันนี้" + clock).dueTime).toBe(expected));
  it("resolves a named weekday, an explicit date and a new custom course", () => {
    expect(parse("อ่าน CS999 วันศุกร์").dueDate).toBe("2026-11-27");
    expect(parse("ส่ง CS999 01/12/2026")).toMatchObject({ category: "CS999", dueDate: "2026-12-01" });
    expect(parse("review C++ tomorrow")).toMatchObject({ category: "C++", title: "review" });
  });
  it.each([
    ["วันศุกร์ 2026-12-04"], ["2026-12-04 วันศุกร์"],
    ["วันศุกร์ 4/12/2026"], ["4/12/2026 วันศุกร์"],
  ])("uses the written date in %s even beyond the next week", (dates) => {
    const draft = parse("ส่งแลบ CS264 " + dates + " บ่ายสอง");
    expect(draft).toMatchObject({
      title: "ส่งแลบ", category: courses[0], dueDate: "2026-12-04", dueTime: "14:00", dateConflict: null,
    });
    expect(toCreateTaskInput(draft).dueDate).toBe(draft.dueDate);
  });
  it.each(["วันศุกร์ 2026-12-01", "2026-12-01 วันศุกร์"])(
    "prefills the written date for review when %s disagrees", (dates) => {
      expect(parse("อ่าน CS264 " + dates)).toMatchObject({
        title: "อ่าน", dueDate: "2026-12-01", dateConflict: { weekday: "วันศุกร์", date: "2026-12-01" },
      });
    },
  );
  it.each(["วันจันทร์ 2026-02-30", "2026-02-30 วันจันทร์"])(
    "requires a date correction for %s", (dates) => {
      const draft = parse("จด CS264 " + dates);
      expect(draft).toMatchObject({
        title: "จด", dueDate: "", dateConflict: { weekday: "วันจันทร์", date: "2026-02-30" },
      });
      expect(validateTaskForm(draft).dueDate).toBe("dueDateRequired");
    },
  );
  it("keeps title words between a weekday and its written date", () => {
    expect(parse("อ่าน วันศุกร์ บทที่ 2 CS264 2026-12-04")).toMatchObject({
      title: "อ่าน บทที่ 2", dueDate: "2026-12-04", dateConflict: null,
    });
  });
  it.each([
    ["2026-12-04 CS264 อ่านเรื่อง “คืนวันศุกร์”", "อ่านเรื่อง “คืนวันศุกร์”"],
    ['📚 อ่านเรื่อง"คืนวันศุกร์" CS264 4/12/2026', '📚 อ่านเรื่อง"คืนวันศุกร์"'],
    ["อ่าน ‘คืนวันจันทร์’ 2026-12-04 CS264", "อ่าน ‘คืนวันจันทร์’"],
    ["2026-12-04 CS264 อ่าน 'คืนวันจันทร์'", "อ่าน 'คืนวันจันทร์'"],
    ["CS264 อ่าน“ส่วน ‘วันพุธ’ และวันศุกร์” 2026-12-04", "อ่าน“ส่วน ‘วันพุธ’ และวันศุกร์”"],
  ])("preserves the quoted weekday in %s", (sentence, title) => {
    expect(parse(sentence)).toMatchObject({ title, category: courses[0], dueDate: "2026-12-04", dateConflict: null });
  });
  it("preserves quoted whitespace, course and time while extracting their unquoted occurrences", () => {
    const title = "📚 อ่าน “CS900  วันศุกร์  08:30”";
    expect(parse(title + " จาก CS264 วันศุกร์ 2026-12-04 เวลา 14:00")).toMatchObject({
      title: title + " จาก", category: courses[0], dueDate: "2026-12-04", dueTime: "14:00", dateConflict: null,
    });
  });
  it("maps extractions before, between and after separate quoted title spans", () => {
    const left = "📚 อ่าน“คืน  วันศุกร์”";
    const right = '"CS900  08:30" ท้าย';
    const fields = "CS264 วันศุกร์ 4/12/2026 14:00";
    for (const sentence of [[fields, left, right], [left, fields, right], [left, right, fields]]) {
      expect(parse(sentence.join(" "))).toMatchObject({
        title: left + " " + right, category: courses[0], dueDate: "2026-12-04", dueTime: "14:00", dateConflict: null,
      });
    }
  });
  it("reviews conflicting unquoted fields and preserves the identical weekday inside the title", () => {
    const title = 'อ่าน "คืนวันศุกร์"';
    expect(parse("วันศุกร์ CS264 " + title + " 2026-12-01")).toMatchObject({
      title, dueDate: "2026-12-01", dateConflict: { weekday: "วันศุกร์", date: "2026-12-01" },
    });
  });
  it("leaves a date entirely inside the title for manual scheduling", () => {
    const title = "อ่าน “พรุ่งนี้ 2026-12-04”";
    expect(parse(title + " CS264")).toMatchObject({ title, category: courses[0], dueDate: "" });
  });
  it("keeps escaped inner quotes and treats an even pair of backslashes as literal", () => {
    const title = 'อ่าน "คำว่า \\"คืนวันศุกร์\\" และ \\\\"';
    expect(parse(title + " CS264 2026-12-04")).toMatchObject({ title, dueDate: "2026-12-04", dateConflict: null });
  });
  it.each(["don't lose Friday's notes", "students’ notes", "James' notes", 'compare the 6" screen', "O’Neil's plan"])(
    "leaves ordinary punctuation in %s and still reads tomorrow", (title) => {
      expect(parse(title + " CS264 tomorrow")).toMatchObject({ title, category: courses[0], dueDate: "2026-11-22", dateConflict: null });
    },
  );
  it.each([
    '  CS264 อ่าน "คืนวันศุกร์ 2026-12-04 ', "CS264 อ่าน คืนวันศุกร์” 2026-12-04",
    "CS264 อ่าน ’คืนวันศุกร์’ 2026-12-04", 'CS264 อ่าน \\"คืนวันศุกร์\\" 2026-12-04',
  ])(
    "sends unclear quotes to review with the original entry intact", (sentence) => {
      expect(parse(sentence)).toMatchObject({ title: sentence, dueDate: "", dateConflict: { message: "unclearQuotes" } });
    },
  );
  it.each([
    ["ส่งรายงาน 2026-12-01 ถึง 04/12/2026", "2026-12-01", "04/12/2026"],
    ['อ่าน "บันทึก 2026-12-01" 2026-12-04', "2026-12-01", "2026-12-04"],
    ["วันนี้ วันศุกร์ 1/12/2026 หรือ 2026-12-04 หรือ 2026-12-08", "1/12/2026", "2026-12-04"],
    ["ทบทวน 2026-12-04 และ 4/12/2026", "2026-12-04", "4/12/2026"],
  ])("keeps both written dates in %s until a due date is chosen", (title, firstDate, secondDate) => {
    const draft = parse(title + " CS264 บ่ายสอง");
    expect(draft).toMatchObject({
      title, category: courses[0], dueDate: "", dueTime: "14:00",
      dateConflict: { firstDate, secondDate },
    });
    expect(validateTaskForm(draft).dueDate).toBe("dueDateRequired");
  });
  it("keeps missing and invalid fields available to the regular form", () => {
    const draft = parse("Write report tomorrow 14:00");
    expect(draft).toMatchObject({ title: "Write report", category: "", dueTime: "14:00" });
    expect(validateTaskForm(draft)).toHaveProperty("category");
    expect(parse("ส่ง CS264 พรุ่งนี้เย็น ๆ")).toMatchObject({
      title: "ส่ง", dueTime: "", needsTimeReview: true,
    });
    expect(parse("ส่ง CS264 พรุ่งนี้ตอนบ่ายสอง")).toMatchObject({
      title: "ส่ง", dueTime: "14:00", needsTimeReview: false,
    });
    expect(parse("ส่ง CS264 31/02/2026").dueDate).toBe("");
    expect(validateTaskForm(parse("ส่ง CS264 วันนี้ 29:77"))).toHaveProperty("dueTime");
  });
  it("retains the draft title and crosses month and year boundaries", () => {
    expect(parseQuickEntry("งาน CS264 พรุ่งนี้บ่ายสอง", courses, new Date(2026, 11, 31))).toMatchObject({ title: "งาน", dueDate: "2027-01-01" });
    expect(parse("Design studio sketch tomorrow")).toMatchObject({ category: "Design studio", title: "sketch" });
  });
  it("matches calendar notes to folder colours even with full course labels", () => {
    expect(courseInk(courses[0])).toBe(courseInk("cs264"));
  });
});
