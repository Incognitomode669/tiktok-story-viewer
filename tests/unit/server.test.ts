import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseUsername } from "@/lib/username";
import { fetchApifyStories } from "@/services/tiktok/apify-client";
import { ApifyTikTokStoryProvider } from "@/services/tiktok/apify-story-provider";
import { StoryService } from "@/services/tiktok/story-service";
import { GET } from "@/app/api/tiktok/story/route";
import { NextRequest } from "next/server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("username validation", () => {
  it("normalizes a single @ and case", () => expect(parseUsername(" @Example.user_ ")).toBe("example.user_"));
  it.each(["", "@@hello", "a b", "https://tiktok.com/@name", "a/../b", "ends.", "a".repeat(25), "<script>"])("rejects %s", (value) => expect(parseUsername(value)).toBeNull());
});

describe("server transport", () => {
  it("uses a Bearer header, verified input shape and no persistent caching", async () => {
    vi.stubEnv("APIFY_TOKEN", "test-secret");
    const fetch = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchApifyStories("example")).toEqual([]);
    const [url, options] = fetch.mock.calls[0];
    expect(url).not.toContain("test-secret");
    expect(options.headers.Authorization).toBe("Bearer test-secret");
    expect(JSON.parse(options.body)).toEqual({ unique_id: "@example", user_id: "", maxResults: 20 });
    expect(options.cache).toBe("no-store");
  });
  it.each([[429, "RATE_LIMITED"], [408, "TIMEOUT"], [504, "TIMEOUT"], [401, "PROVIDER_ERROR"], [404, "PROVIDER_ERROR"], [500, "PROVIDER_ERROR"]])("maps HTTP %s safely", async (status, code) => {
    vi.stubEnv("APIFY_TOKEN", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive upstream content", { status: Number(status) })));
    await expect(fetchApifyStories("example")).rejects.toMatchObject({ code });
  });
  it("does not echo upstream exception messages", async () => {
    vi.stubEnv("APIFY_TOKEN", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("test-secret")));
    await expect(fetchApifyStories("example")).rejects.not.toThrow("test-secret");
  });
  it("maps abort timeouts", async () => {
    vi.stubEnv("APIFY_TOKEN", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("expired", "TimeoutError")));
    await expect(fetchApifyStories("example")).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("connects the provider and normalizes an observed empty dataset", async () => {
    vi.stubEnv("APIFY_TOKEN", "test-secret");
    const fetch = vi.fn().mockResolvedValue(new Response("[]")); vi.stubGlobal("fetch", fetch);
    await expect(new ApifyTikTokStoryProvider().getStories("example")).resolves.toEqual({ username: "example", hasStory: false, stories: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("cache", () => {
  it("coalesces concurrent requests, caches briefly, then refreshes", async () => {
    let now = 0;
    const getStories = vi.fn().mockResolvedValue({ username: "example", hasStory: false, stories: [] });
    const service = new StoryService({ getStories }, () => now);
    await Promise.all([service.getStories("example"), service.getStories("example")]);
    await service.getStories("example");
    expect(getStories).toHaveBeenCalledTimes(1);
    now = 60_001;
    await service.getStories("example");
    expect(getStories).toHaveBeenCalledTimes(2);
  });
  it("does not cache provider failures", async () => {
    const getStories = vi.fn().mockRejectedValue(new Error("unavailable"));
    const service = new StoryService({ getStories });
    await expect(service.getStories("example")).rejects.toThrow();
    await expect(service.getStories("example")).rejects.toThrow();
    expect(getStories).toHaveBeenCalledTimes(2);
  });
});

describe("API", () => {
  it("returns HTTP 200 for the live-observed empty shape instead of the old 503 gate", async () => {
    vi.stubEnv("APIFY_TOKEN", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]")));
    const response = await GET(new NextRequest("http://localhost/api/tiktok/story?username=ewwzel"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, username: "ewwzel", hasStory: false, stories: [] });
  });
  it("rejects malformed usernames before calling a provider", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await GET(new NextRequest("http://localhost/api/tiktok/story?username=a/b"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_USERNAME");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns a safe missing-configuration error", async () => {
    vi.stubEnv("APIFY_TOKEN", "");
    const response = await GET(new NextRequest("http://localhost/api/tiktok/story?username=example"));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("NOT_CONFIGURED");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
