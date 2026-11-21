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
