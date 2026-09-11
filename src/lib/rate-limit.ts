import "server-only";

// Per-process budget, deliberately independent of untrusted forwarded IP headers.
// Before public deployment, enforce a durable per-client limit at the trusted edge.
let windowEnds = 0;
let requests = 0;
export function allowStoryLookup(now = Date.now()): boolean {
  if (now >= windowEnds) {
    windowEnds = now + 60_000;
    requests = 0;
  }
  requests += 1;
  return requests <= 10;
}
