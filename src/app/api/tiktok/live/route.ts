import { parseUsername } from "@/lib/username";
import { allowStoryLookup } from "@/lib/rate-limit";
import { getLive } from "@/services/konbini/live";
import { KonbiniError } from "@/services/konbini/client";
export const runtime = "nodejs";
export const maxDuration = 65;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const username = parseUsername(new URL(request.url).searchParams.get("username") ?? "");
  if (!username) return Response.json({ error: "Enter a valid username." }, { status: 400, headers });
  if (!allowStoryLookup()) return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429, headers });
  try { return Response.json(await getLive(username), { headers }); }
  catch (error) {
    const code = error instanceof KonbiniError ? error.code : "provider_error";
    const message = code === "credits_exhausted" ? "Konbini credits are exhausted." : code === "unsupported_stream" ? "This broadcast has no supported FLV stream." : "Live status could not be loaded. Please try again.";
    return Response.json({ error: message }, { status: 502, headers });
  }
}
