import { withCredentials } from "@/services/konbini/credentials";
import { serveLive } from "@/services/konbini/live";
export const runtime = "nodejs";
export const GET = withCredentials(serveLive);
