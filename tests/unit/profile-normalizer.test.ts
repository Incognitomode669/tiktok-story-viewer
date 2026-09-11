import { describe, it, expect } from "vitest";
import { normalizeProfile, safeUrl } from "@/services/tiktok-profile/normalize-profile";

// Synthetic fixtures shaped from the linked provider documentation.
const author = { name: "example", nickName: "Example", fans: 183, following: 78, heart: 887, video: 3 };
const post = { id: "123", text: "A post", authorMeta: author, videoMeta: { coverUrl: "https://p16.tiktokcdn.com/cover.jpg" }, webVideoUrl: "https://www.tiktok.com/@example/video/123", input: "example", fromProfileSection: "videos" };
describe("profile normalizers", () => {
  it("preserves the live profile-only response when no videos are returned", () => {
    const result = normalizeProfile([{ authorMeta: { ...author, video: 0 }, input: "example", note: "Profile has no videos (or is behind a login wall)" }], "example", "posts");
    expect(result.profile?.posts).toBe(0);
    expect(result.profile?.followers).toBe(183);
    expect(result.items).toEqual([]);
  });
  it("maps profile counts without confusing likes with liked posts", () => {
    const result = normalizeProfile([post], "example", "posts");
    expect(result.profile).toMatchObject({ followers: 183, following: 78, likes: 887, posts: 3 });
    expect(result.items[0].url).toBe(post.webVideoUrl);
  });
  it("does not substitute a repost creator's stats for the searched profile", () => {
    const result = normalizeProfile([{ ...post, authorMeta: { ...author, name: "another" }, fromProfileSection: "reposts" }], "example", "reposts");
    expect(result.profile).toBeUndefined();
    expect(result.items[0].author?.username).toBe("another");
  });
  it("validates connection ownership and direction", () => {
    const row = { authorMeta: { name: "follower" }, connectedTo: author, connectionType: "follower" };
    expect(normalizeProfile([row], "example", "followers").items[0].author?.username).toBe("follower");
    expect(() => normalizeProfile([row], "wrong", "followers")).toThrow();
    expect(() => normalizeProfile([row], "example", "following")).toThrow();
  });
  it("validates highlight collection and post ownership", () => {
    expect(normalizeProfile([{ unique_id: "example", highlight_id: "123", title: "Travel", post_count: 2 }], "example", "highlights").items[0].count).toBe(2);
    const row = { highlight_id: "123", video_id: "456", title: "Photo", author_info: { unique_id: "example" }, images: ["https://p16.tiktokcdn.com/a.jpg", "javascript:bad"] };
    expect(normalizeProfile([row], "example", "highlights", "123").items[0].images).toHaveLength(1);
    expect(() => normalizeProfile([row], "example", "highlights", "999")).toThrow();
  });
  it("does not convert provider errors or malformed output into empty results", () => {
    for (const rows of [{}, [{}], [{ errorCode: "PROFILE_REPOSTS_EMPTY" }], [{ error: "limit" }]]) expect(() => normalizeProfile(rows, "example", "posts")).toThrow();
    expect(normalizeProfile([], "example", "posts").items).toEqual([]);
  });
  it("retains unknown counts as missing, and deduplicates items", () => {
    const result = normalizeProfile([{ ...post, authorMeta: { name: "example" } }, { ...post, authorMeta: { name: "example" } }], "example", "posts");
    expect(result.profile?.followers).toBeUndefined();
    expect(result.items).toHaveLength(1);
  });
  it.each(["https://tiktokcdn.com.evil.test/a", "http://p16.tiktokcdn.com/a", "https://user:pass@p16.tiktokcdn.com/a", "javascript:alert(1)", "https://127.0.0.1/a"])("rejects unsafe image URLs %s", value => expect(safeUrl(value)).toBeUndefined());
});

it("expands the connection limit and stops when the reported total is reached", () => {
  const rows = Array.from({ length: 30 }, (_, id) => ({ authorMeta: { name: `account${id}` }, connectedTo: { ...author, following: 30 }, connectionType: "following" }));
  expect(normalizeProfile(rows, "example", "following", undefined, 24).items).toHaveLength(24);
  expect(normalizeProfile(rows, "example", "following", undefined, 24).limited).toBe(true);
  expect(normalizeProfile(rows, "example", "following", undefined, 36).limited).toBe(false);
});

it("accepts a provider creator with a leading period without failing the repost list", () => {
  const rows = [
    { ...post, id: "1", fromProfileSection: "reposts", authorMeta: { name: "regular_creator" } },
    { ...post, id: "2", fromProfileSection: "reposts", authorMeta: { name: ".peasy" } },
  ];
  const result = normalizeProfile(rows, "example", "reposts");
  expect(result.items).toHaveLength(2);
  expect(result.items[1].author?.username).toBe(".peasy");
  expect(result.profile).toBeUndefined();
  expect(() => normalizeProfile(rows, "another_account", "reposts")).toThrow("PROFILE_RESPONSE");
});

it.each(["bad/name", "bad?name", "bad name", "<script>"])("still rejects malformed provider handles: %s", name => {
  expect(() => normalizeProfile([{ ...post, fromProfileSection: "reposts", authorMeta: { name } }], "example", "reposts")).toThrow("PROFILE_RESPONSE");
});
