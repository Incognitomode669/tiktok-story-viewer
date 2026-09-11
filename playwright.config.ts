import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000", channel: "chrome", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
