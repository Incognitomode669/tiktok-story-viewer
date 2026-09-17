import { withCredentials } from "@/services/konbini/credentials";
import { serveMedia } from "@/services/konbini/media";
export const runtime = "nodejs";
export const maxDuration = 65;
export const GET = withCredentials(serveMedia);
