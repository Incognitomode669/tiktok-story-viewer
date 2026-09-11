import { test, expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";

for (const width of [1440, 768, 390]) {
  test(`profile sections render and load on demand at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    let requests = 0;
    await page.route("https://www.tiktok.com/player/v1/**", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body><video controls></video></body></html>" }));
    await page.route("**/api/tiktok/story?*", route => route.fulfill({ json: { success: true, username: "example", hasStory: false, stories: [] } }));
    await page.route("**/api/tiktok/profile", route => {
      requests++;
      const { username, section, highlightId } = route.request().postDataJSON();
      const owner = { username, displayName: "Example", followers: 183, following: 78, likes: 887, posts: 3 };
      const items = section === "highlights" ? [{ id: "123", title: highlightId ? "Highlight post" : "Travel collection", count: 2 }] : [{ id: "123", title: "Public post preview", url: "https://www.tiktok.com/@example/video/123", author: owner }];
      return route.fulfill({ json: { success: true, username, section, profile: owner, items, limited: false } });
    });
    await page.goto("/");
    await page.getByLabel(copy.label).fill("example");
    await page.getByRole("button", { name: copy.submit }).click();
    const panel = page.locator(".profile-explorer");
    await expect(panel).toBeVisible();
    expect(requests).toBe(0);
    await panel.getByRole("button", { name: "Posts", exact: true }).click();
    await expect(panel.getByText("183", { exact: true })).toBeVisible();
    await expect(panel.getByRole("link", { name: copy.profile.open })).toHaveCount(0);
    await panel.getByRole("button", { name: copy.profile.watch }).click();
    await expect(panel.locator("iframe")).toHaveAttribute("src", /https:\/\/www\.tiktok\.com\/player\/v1\/123\?/);
    await expect(page).toHaveURL("/");
    await panel.getByRole("button", { name: copy.profile.closePlayer }).click();
    await expect(panel.locator("iframe")).toHaveCount(0);
    await panel.getByRole("button", { name: "Reposts", exact: true }).click();
    await expect(panel.getByText("Public post preview")).toBeVisible();
    await panel.getByRole("button", { name: copy.profile.watch }).click();
    await expect(panel.locator("iframe")).toHaveCount(1);
    await panel.getByRole("button", { name: "Posts", exact: true }).click();
    expect(requests).toBe(2);
    await expect(panel.locator("iframe")).toHaveCount(0);
    await panel.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `.local/qa-profile-${width}.png`, fullPage: true });
    await panel.getByRole("button", { name: "Highlights", exact: true }).click();
    await panel.getByRole("button", { name: "2 posts", exact: true }).click();
    await expect(panel.getByText("Highlight post", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: copy.profile.back }).click();
    await expect(panel.getByText("Travel collection")).toBeVisible();
    await page.getByLabel(copy.label).fill("another");
    await page.getByRole("button", { name: copy.submit }).click();
    await expect(panel.getByRole("heading")).toHaveText("@another");
    await expect(panel.getByText("183", { exact: true })).toHaveCount(0);
  });
}

test("following View more preserves results on failure, deduplicates and stops at total", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route("**/api/tiktok/story?*", route => route.fulfill({ json: { success: true, username: "example", stories: [], hasStory: false } }));
  let fail = true;
  const limits: number[] = [];
  await page.route("**/api/tiktok/profile", route => {
    const { limit = 12, section } = route.request().postDataJSON(); limits.push(limit);
    if (limit === 24 && fail) { fail = false; return route.fulfill({ status: 502, json: { success: false, code: "PROFILE_UNAVAILABLE" } }); }
    const items = Array.from({ length: Math.min(limit, 30) }, (_, id) => ({ id: String(id), title: `Account ${id}`, author: { username: `account${id}`, displayName: `Account ${id}` } }));
    return route.fulfill({ json: { success: true, username: "example", section, profile: { username: "example", displayName: "Example", following: 30 }, items, limited: limit < 30, limit } });
  });
  await page.goto("/");
  await page.getByLabel(copy.label).fill("example");
  await page.getByRole("button", { name: copy.submit }).click();
  const panel = page.locator(".profile-explorer");
  await panel.getByRole("button", { name: "Following", exact: true }).click();
  await expect(panel.getByText(copy.profile.loadedAccounts(12, 30))).toBeVisible();
  await panel.getByRole("button", { name: copy.profile.viewMore }).click();
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(panel.locator(".profile-explorer__card")).toHaveCount(12);
  await panel.getByRole("button", { name: copy.profile.viewMore }).click();
  await expect(panel.locator(".profile-explorer__card")).toHaveCount(24);
  await expect(panel.getByText(copy.profile.loadedAccounts(24, 30))).toBeVisible();
  await panel.locator(".profile-explorer__list-footer").screenshot({ path: ".local/qa-view-more.png" });
  await panel.getByRole("button", { name: copy.profile.viewMore }).click();
  await expect(panel.locator(".profile-explorer__card")).toHaveCount(30);
  await expect(panel.getByRole("button", { name: copy.profile.viewMore })).toHaveCount(0);
  expect(limits).toEqual([12, 24, 24, 36]);
});
