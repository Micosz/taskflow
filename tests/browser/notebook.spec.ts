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
  await entry.press("Enter");
  await expect(date).toBeFocused();
  await date.press("Enter");
  await expect(entry).toHaveValue("");
  await page.reload();
  expect(await savedTasks(page)).toEqual([expect.objectContaining({ title: "อ่าน", dueDate: "2026-12-01" })]);
});
