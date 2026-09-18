import { cookies } from "next/headers";
import { keyCookie, saveKey, hasKey, keyLifetimeSeconds, KeyConfigurationError } from "@/services/konbini/credentials";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  const id = (await cookies()).get(keyCookie)?.value;
  return Response.json({ personal: hasKey(id), expired: Boolean(id && !hasKey(id)), server: Boolean(process.env.KONBINI_API_KEY?.trim()) }, { headers });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Request origin rejected." }, { status: 403, headers });
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error();
    const { key } = JSON.parse(body);
    if (typeof key !== "string" || !key.trim() || key.trim().length > 2048 || /\s/.test(key.trim())) throw new Error();
    const jar = await cookies();
    const id = saveKey(key.trim());
    jar.set(keyCookie, id, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: keyLifetimeSeconds });
    return Response.json({ saved: true }, { headers });
  } catch (error) {
    if (error instanceof KeyConfigurationError) return Response.json({ error: error.message }, { status: 503, headers });
    return Response.json({ error: "Enter a valid API key without spaces." }, { status: 400, headers }); }
}
export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Request origin rejected." }, { status: 403, headers });
  const jar = await cookies(); jar.delete(keyCookie);
  return Response.json({ removed: true }, { headers });
}
