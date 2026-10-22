import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
const chrome =
  process.env.CHROME_PATH ||
  (existsSync("/bin/google-chrome") ? "/bin/google-chrome" : undefined);
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: chrome, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
