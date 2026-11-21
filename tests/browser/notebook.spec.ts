import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort(),
  );
  await page.addInitScript(() => localStorage.setItem("taskflow.locale", "th"));
  await page.clock.setFixedTime(new Date("2026-11-21T23:55:00+07:00"));
  await page.goto("/");
});

function savedTasks(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("taskflow:v1:tasks") ?? '{"tasks":[]}').tasks);
}

test("the date preview survives Enter and reload", async ({ page }) => {
  const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
  await entry.fill("ส่งแลบ CS264 วันศุกร์ 2026-12-04 บ่ายสอง");
  await expect(page.locator(".quick-entry__preview")).toContainText("4 ธ.ค.");
  await expect(page.locator(".quick-entry__preview")).toContainText("14:00");
  await entry.press("Enter");
  await expect(entry).toHaveValue("");
  await expect(entry).toBeFocused();
  await page.reload();
  await expect(entry).toBeVisible();
  expect(await savedTasks(page)).toEqual([expect.objectContaining({
    title: "ส่งแลบ", category: "CS264", dueDate: "2026-12-04", dueTime: "14:00",
  })]);
});

test("a conflicting weekday opens the due date for keyboard review", async ({ page }) => {
  const sentence = "อ่าน CS264 2026-12-01 วันศุกร์";
  const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
  await entry.fill(sentence);
  await expect(page.getByRole("button", { name: "ตรวจวันส่ง" })).toBeVisible();
  await expect(page.locator(".quick-entry__preview")).toContainText("1 ธ.ค.");
  await entry.press("Enter");
  const date = page.getByRole("dialog").locator('input[name="dueDate"]');
  await expect(date).toBeFocused();
  await expect(date).toHaveValue("01/12/2026");
  await expect(date).toHaveAccessibleDescription(/วันศุกร์.*2026-12-01/);
  expect(await savedTasks(page)).toEqual([]);
  await date.press("Escape");
  await expect(entry).toBeFocused();
  await expect(entry).toHaveValue(sentence);
  const dateChip = page.locator(".quick-entry__preview").getByRole("button", { name: /1 ธ.ค./ });
  await dateChip.press("Enter");
  await expect(date).toBeFocused();
  await date.press("Escape");
  await expect(dateChip).toBeFocused();
  await dateChip.press("Enter");
  await expect(date).toBeFocused();
  await date.press("Enter");
  await expect(entry).toHaveValue("");
  await expect(entry).toBeFocused();
  await page.reload();
  expect(await savedTasks(page)).toEqual([expect.objectContaining({ title: "อ่าน", dueDate: "2026-12-01" })]);
});

for (const example of [
  { name: "curly quoted title", sentence: "2026-12-04 CS264 อ่านเรื่อง “คืนวันศุกร์”", title: "อ่านเรื่อง “คืนวันศุกร์”", day: "2026-12-04" },
  { name: "straight quoted title on a phone", sentence: '📚 อ่านเรื่อง"คืนวันศุกร์" CS264 4/12/2026', title: '📚 อ่านเรื่อง"คืนวันศุกร์"', day: "2026-12-04", phone: true },
  { name: "matching unquoted weekday", sentence: "วันศุกร์ 📚 อ่าน “บทวันศุกร์” CS264 2026-12-04", title: "📚 อ่าน “บทวันศุกร์”", day: "2026-12-04" },
  { name: "conflicting unquoted weekday", sentence: 'วันศุกร์ CS264 อ่าน "บทวันศุกร์" 2026-12-01', title: 'อ่าน "บทวันศุกร์"', day: "2026-12-01", review: true },
]) {
  test(`guest save keeps the exact title for a ${example.name}`, async ({ page }) => {
    if (example.phone) await page.setViewportSize({ width: 390, height: 844 });
    const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
    await entry.fill(example.sentence);
    await expect(page.locator(".quick-entry__preview")).toContainText(example.review ? "1 ธ.ค." : "4 ธ.ค.");
    await entry.press("Enter");
    if (example.review) {
      const dialog = page.getByRole("dialog");
      const date = dialog.locator('input[name="dueDate"]');
      await expect(date).toBeFocused();
      await expect(dialog.locator('input[name="title"]')).toHaveValue(example.title);
      expect(await savedTasks(page)).toEqual([]);
      await date.press("Enter");
    }
    await expect(entry).toHaveValue("");
    await page.reload();
    expect(await savedTasks(page)).toEqual([expect.objectContaining({ title: example.title, category: "CS264", dueDate: example.day })]);
  });
}

test("an unfinished quotation opens review with the entire entry and cancels losslessly", async ({ page }) => {
  const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
  const sentence = 'CS264 อ่าน "คืนวันศุกร์ 2026-12-04';
  await entry.fill(sentence);
  await entry.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('input[name="title"]')).toHaveValue(sentence);
  const date = dialog.locator('input[name="dueDate"]');
  await expect(date).toBeFocused();
  await expect(date).toHaveValue("");
  await expect(date).toHaveAccessibleDescription(/เครื่องหมายคำพูด/);
  expect(await savedTasks(page)).toEqual([]);
  await date.press("Escape");
  await expect(entry).toHaveValue(sentence);
  await expect(entry).toBeFocused();
});

test("an impossible date has to be corrected before the task can be saved", async ({ page }) => {
  const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
  await entry.fill("จด CS264 วันจันทร์ 2026-02-30 บ่ายสอง");
  await entry.press("Enter");
  const date = page.getByRole("dialog").locator('input[name="dueDate"]');
  await expect(date).toBeFocused();
  await expect(date).toHaveValue("");
  await date.press("Enter");
  await expect(date).toHaveAttribute("aria-invalid", "true");
  expect(await savedTasks(page)).toEqual([]);
  await date.fill("02/03/2026");
  await date.press("Enter");
  await expect(entry).toBeFocused();
  await expect(entry).toHaveValue("");
  expect(await savedTasks(page)).toEqual([expect.objectContaining({
    title: "จด", dueDate: "2026-03-02", dueTime: "14:00",
  })]);
});

for (const example of [
  { kind: "desktop range", width: 1280, height: 800, title: "ส่งรายงาน 2026-12-01 ถึง 04/12/2026", secondDate: "04/12/2026" },
  { kind: "phone quoted title", width: 390, height: 844, title: 'อ่าน "บันทึก 2026-12-01" 2026-12-04', secondDate: "2026-12-04" },
]) {
  test(`two written dates in a ${example.kind} require a choice and keep the title`, async ({ page }) => {
    await page.setViewportSize({ width: example.width, height: example.height });
    const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
    const sentence = example.title + " CS264 บ่ายสอง";
    const preview = page.locator(".quick-entry__preview");
    await entry.fill(sentence);
    await expect(preview).toContainText("2026-12-01");
    await expect(preview).toContainText(example.secondDate);
    await expect(preview.getByRole("button", { name: /เลือกวัน/ })).toContainText("14:00");
    await entry.press("Enter");
    const dialog = page.getByRole("dialog");
    const date = dialog.locator('input[name="dueDate"]');
    await expect(date).toBeFocused();
    await expect(date).toHaveValue("");
    await expect(date).toHaveAccessibleDescription(/2026-12-01/);
    await expect(dialog.locator('input[name="title"]')).toHaveValue(example.title);
    await date.press("Escape");
    await expect(entry).toBeFocused();
    await expect(entry).toHaveValue(sentence);
    await entry.press("Enter");
    await date.press("Enter");
    await expect(date).toHaveAttribute("aria-invalid", "true");
    expect(await savedTasks(page)).toEqual([]);
    await date.fill("04/12/2026");
    await date.press("Enter");
    await expect(entry).toHaveValue("");
    await expect(entry).toBeFocused();
    await page.reload();
    expect(await savedTasks(page)).toEqual([expect.objectContaining({
      title: example.title, category: "CS264", dueDate: "2026-12-04", dueTime: "14:00",
    })]);
  });
}

test("the phone calendar has its own tab and preserves an unfinished entry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sentence = "ส่งแลบ CS264 วันศุกร์ 2026-12-04";
  const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
  const calendar = page.locator(".task-calendar");
  const views = page.getByRole("navigation", { name: "มุมมองงาน" });
  await entry.fill(sentence);
  await expect(calendar).toBeHidden();
  await views.getByRole("button", { name: "ปฏิทิน" }).press("Enter");
  await expect(calendar).toBeVisible();
  await expect(entry).toBeHidden();
  await calendar.getByRole("button", { name: "เดือนถัดไป" }).click();
  await calendar.getByRole("button", { name: "เดือนถัดไป" }).click();
  await expect(calendar.locator(".task-calendar__day")).toHaveCount(42);
  await views.getByRole("button", { name: /^ภาพรวม/ }).press("Enter");
  await expect(entry).toHaveValue(sentence);
  await expect(calendar).toBeHidden();
  expect(await savedTasks(page)).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(calendar).toBeVisible();
  await expect(calendar.locator(".task-calendar__day:not([data-outside])")).toHaveCount(31);
});

test("one Tab enters the month and the next Tab reaches the selected day's notes", async ({ page }) => {
  const entry = page.getByRole("textbox", { name: "เพิ่มงานอย่างรวดเร็ว" });
  await entry.fill("ทบทวน CS264 พรุ่งนี้");
  await entry.press("Enter");
  await expect(entry).toHaveValue("");
  const calendar = page.locator(".task-calendar");
  await calendar.locator(".task-calendar__legend button").last().press("Tab");
  await expect(calendar.locator('[aria-current="date"]')).toBeFocused();
  const grid = calendar.getByRole("grid");
  await expect(grid.getByRole("columnheader")).toHaveCount(7);
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  const selected = grid.getByRole("gridcell", { selected: true }).getByRole("button");
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAccessibleName(/22 พฤศจิกายน/);
  await page.keyboard.press("Tab");
  const note = calendar.locator(".task-calendar__note");
  await expect(note).toBeFocused();
  await note.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("ทบทวน");
  await page.keyboard.press("Escape");
  await expect(note).toBeFocused();
  await note.press("Shift+Tab");
  await expect(selected).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAccessibleName(/22 ธันวาคม/);
  await page.keyboard.press("Home");
  await expect(selected).toHaveAccessibleName(/20 ธันวาคม/);
  await calendar.getByRole("button", { name: "เดือนถัดไป" }).click();
  await expect(calendar.getByRole("button", { name: "เดือนถัดไป" })).toBeFocused();
  await expect(selected).toHaveAccessibleName(/1 มกราคม/);
});
