import { describe, expect, it } from "vitest";
import { normalizeApifyStories } from "@/services/tiktok/normalize-apify-stories";

// Documentation-derived fixture; not represented as a captured live video result.
const documentedVideo = {
  aweme_id: "documented-story-id",
  video_id: "documented-video-id",
  play: "https://v31-jp.tiktokcdn.com/test-video.mp4",
  wmplay: "https://v31-jp.tiktokcdn.com/test-watermarked.mp4",
  cover: "https://p16-pu-sign-no.tiktokcdn-eu.com/test-cover.jpg",
  duration: 15,
  author: { unique_id: "ewwzel", nickname: "Example name" },
  scrapedAt: "2026-09-11T00:00:00.000Z",
};

describe("Apify normalization", () => {
  it.each([0, 1, 18, 12345])("maps the provider play count %s", (views) => {
    expect(normalizeApifyStories([{ ...documentedVideo, play_count: views }], "ewwzel").stories[0].views).toBe(views);
  });
  it.each([undefined, null, -1, 1.5, "18", Infinity, NaN])("does not invent a view count for %s", (views) => {
    expect(normalizeApifyStories([{ ...documentedVideo, play_count: views }], "ewwzel").stories[0].views).toBeUndefined();
  });
  it("passes through the avatar field observed in a successful provider result", () => {
    const avatar = "https://p19-common-sign.tiktokcdn-eu.com/test-avatar.jpg";
    const result = normalizeApifyStories([{ ...documentedVideo, author: { ...documentedVideo.author, avatar } }], "ewwzel");
    expect(result.stories[0].author.avatar).toBe(avatar);
  });
  it.each([null, {}, "", "javascript:alert(1)", "http://p19-common-sign.tiktokcdn-eu.com/avatar.jpg", "https://tiktokcdn-eu.com.evil.test/avatar.jpg"])("omits invalid avatars without losing the Story: %j", (avatar) => {
    const result = normalizeApifyStories([{ ...documentedVideo, author: { ...documentedVideo.author, avatar } }], "ewwzel");
    expect(result.stories).toHaveLength(1);
    expect(result.stories[0].author).not.toHaveProperty("avatar");
  });
  it("handles the actual empty response captured for ewwzel", () => {
    expect(normalizeApifyStories([], "ewwzel")).toEqual({ username: "ewwzel", hasStory: false, stories: [] });
  });
  it("maps the documented video contract without leaking raw fields or inventing timestamps", () => {
    const result = normalizeApifyStories([documentedVideo], "ewwzel");
    expect(result.hasStory).toBe(true);
    expect(result.stories[0]).toMatchObject({ id: documentedVideo.aweme_id, type: "video", videoUrl: documentedVideo.play, duration: 15, author: { username: "ewwzel", displayName: "Example name" } });
    expect(result.stories[0]).not.toHaveProperty("scrapedAt");
    expect(result.stories[0]).not.toHaveProperty("createdAt");
    expect(result.stories[0].author).not.toHaveProperty("avatar");
  });
  it.each([null, {}, { error: "upstream error" }, [{}], [null], [{ ...documentedVideo, author: { unique_id: "someone_else" } }]])("rejects unsupported data instead of silently returning no stories", (input) => {
    expect(() => normalizeApifyStories(input, "ewwzel")).toThrow();
  });
  it.each(["javascript:alert(1)", "http://v31-jp.tiktokcdn.com/a", "https://127.0.0.1/a", "https://tiktokcdn.com.evil.test/a", "https://user:password@v31-jp.tiktokcdn.com/a"])("rejects unsafe media %s", (url) => {
    expect(() => normalizeApifyStories([{ ...documentedVideo, play: url, wmplay: null }], "ewwzel")).toThrow();
  });
  it("uses the documented alternate playback URL when needed", () => {
    expect(normalizeApifyStories([{ ...documentedVideo, play: null }], "ewwzel").stories[0].videoUrl).toBe(documentedVideo.wmplay);
  });
  it("does not turn a cover-only item into an image Story", () => {
    expect(() => normalizeApifyStories([{ ...documentedVideo, play: null, wmplay: null }], "ewwzel")).toThrow();
  });
  it("deduplicates provider pagination results", () => {
    expect(normalizeApifyStories([documentedVideo, documentedVideo], "ewwzel").stories).toHaveLength(1);
  });
});
