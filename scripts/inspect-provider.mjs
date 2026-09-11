import env from "@next/env";
env.loadEnvConfig(process.cwd());
const username = (process.argv[2] ?? "").replace(/^@/, "");
if (!/^[A-Za-z0-9_][A-Za-z0-9_.]{0,23}$/.test(username) || username.endsWith(".")) { console.error("Provide a TikTok username."); process.exit(1); }
const key = process.env.KONBINI_API_KEY?.trim();
if (!key) { console.error("Set KONBINI_API_KEY in .env.local."); process.exit(1); }
try {
  const response = await fetch(`https://api.konbiniapi.com/v1/tiktok/users/${encodeURIComponent(username)}/stories?count=30`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(55000) });
  if (!response.ok) { console.error(`KonbiniAPI HTTP ${response.status}`); process.exit(1); }
  const payload = await response.json();
  console.log(JSON.stringify({ username, status: response.status, stories: payload.data?.orderedItems?.length, hasNextPage: Boolean(payload.data?.nextCursor) }));
} catch { console.error("KonbiniAPI lookup failed or timed out."); process.exit(1); }
