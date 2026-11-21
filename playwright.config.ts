import { defineConfig } from "@playwright/test";

const port = Number(process.env.TASKFLOW_TEST_PORT ?? 4312);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL,
    timezoneId: "Asia/Bangkok",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { width: 1280, height: 800 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
  },
});
