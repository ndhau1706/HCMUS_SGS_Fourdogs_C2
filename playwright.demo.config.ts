import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "tests/demo-browser", workers: 1,
  use: { baseURL: "http://localhost:3001", viewport: { width: 1280, height: 720 }, launchOptions: { executablePath: process.env.CHROME_PATH || (existsSync("/bin/google-chrome") ? "/bin/google-chrome" : undefined), args: ["--no-sandbox"] } },
  webServer: { command: "npm run demo -- --production", url: "http://localhost:3001/demo", reuseExistingServer: !process.env.CI, timeout: 60000 },
});
