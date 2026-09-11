import nextEnv from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";

nextEnv.loadEnvConfig(process.cwd());
const username = (process.argv[2] ?? "").trim().replace(/^@/, "");
const token = process.env.APIFY_TOKEN?.trim();
if (!token || !/^[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,22}[A-Za-z0-9_])?$/.test(username)) {
  console.error("Set APIFY_TOKEN in .env.local and run: npm run provider:inspect -- username");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch("https://api.apify.com/v2/actors/powerai~tiktok-user-story-scraper/run-sync-get-dataset-items?timeout=55", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ unique_id: `@${username}`, user_id: "", maxResults: 20 }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
    const data = await response.json();
    await mkdir(".local", { recursive: true });
    await writeFile(".local/apify-response.json", JSON.stringify(data, null, 2));
    console.log("Saved .local/apify-response.json for local inspection. Do not commit temporary media URLs.");
  } catch {
    console.error("Provider inspection failed. Check the run in Apify Console; no secret values were logged.");
    process.exitCode = 1;
  }
}
