import { test, expect } from "@playwright/test";
import { copy } from "../../src/lib/copy";

for (const width of [1440, 768, 390]) {
  test(`rendered layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.submit })).toBeInViewport();
    await expect(page.getByRole("button", { name: copy.submit })).toBeEnabled();
    await page.getByLabel(copy.label).focus();
    expect(await page.getByLabel(copy.label).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
    const values = await page.evaluate(() => {
      const card = document.querySelector(".story-state")!;
      const box = card.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, background: getComputedStyle(card).backgroundColor, ratio: box.width / box.height };
    });
    expect(values.overflow).toBe(false);
    expect(values.background).toBe("rgb(25, 27, 26)");
    expect(values.ratio).toBeCloseTo(9 / 16, 2);
    await page.screenshot({ path: `.local/qa-${width}.png`, fullPage: true });
  });
}

test("validation and provider unavailable state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: copy.submit }).click();
  await expect(page.getByText(copy.errors.INVALID_USERNAME)).toBeVisible();
  await page.route("**/api/tiktok/story?*", (route) => route.fulfill({ status: 503, json: { success: false, error: { code: "NOT_CONFIGURED" } } }));
  await page.getByLabel(copy.label).fill("@example");
  await page.getByRole("button", { name: copy.submit }).click();
  await expect(page.getByText(copy.errors.NOT_CONFIGURED)).toBeVisible();
});

test("video audio defaults on and volume persists through navigation, replay and searches", async ({ page }) => {
  await page.goto("/");
  const videoUrl = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 90; canvas.height = 160;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const ready = new Promise<string>((resolve) => {
      recorder.onstop = () => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(new Blob(chunks, { type: "video/webm" }));
      };
    });
    const draw = setInterval(() => {
      context.fillStyle = getComputedStyle(document.body).backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }, 100);
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    recorder.stop();
    clearInterval(draw);
    stream.getTracks().forEach((track) => track.stop());
    return ready;
  });
  const stories = [1, 2].map((id) => ({ id: String(id), type: "video", videoUrl, author: { username: "test_account", displayName: "Test account" } }));
  await page.route("**/api/tiktok/story?*", (route) => route.fulfill({ json: { success: true, username: "test_account", hasStory: true, stories } }));
  await page.getByLabel(copy.label).fill("test_account");
  await page.getByRole("button", { name: copy.submit }).click();
  const media = page.locator("video");
  await expect(media).toHaveJSProperty("muted", false);
  await expect(media).toHaveJSProperty("volume", 1);
  const tapArea = await page.getByRole("button", { name: copy.next, exact: true }).boundingBox();
  await page.mouse.move(tapArea!.x + 30, tapArea!.y + 200);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await expect(media).toHaveJSProperty("paused", true);
  await page.mouse.up();
  await expect(media).toHaveJSProperty("paused", false);
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
  await page.getByRole("button", { name: copy.pause }).focus(); await page.keyboard.press("Space");
  await expect(media).toHaveJSProperty("paused", true);
  const slider = page.getByRole("slider", { name: copy.volume });
  await page.getByRole("button", { name: copy.mute, exact: true }).hover();
  await slider.press("Home");
  for (let step = 0; step < 35; step++) await slider.press("ArrowUp");
  await expect(media).toHaveJSProperty("volume", 0.35);
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
  await page.getByRole("button", { name: copy.mute, exact: true }).click();
  await expect(media).toHaveJSProperty("muted", true);
  await page.getByRole("button", { name: copy.next, exact: true }).click();
  await expect(media).toHaveJSProperty("muted", true);
  await expect(media).toHaveJSProperty("volume", 0.35);
  await page.getByRole("button", { name: copy.pause, exact: true }).focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: copy.unmute }).click();
  await expect(media).toHaveJSProperty("muted", false);
  await expect(slider).toHaveValue("35");
  await page.getByRole("button", { name: copy.mute, exact: true }).hover();
  await expect(slider).toHaveCSS("opacity", "1");
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: copy.mute, exact: true }).hover();
  await expect(slider).toHaveCSS("height", "100px");
  await page.screenshot({ path: ".local/qa-volume-mobile.png", fullPage: true });
  const controls = await page.locator(".story-viewer__controls").evaluate((element) => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(controls.scroll).toBeLessThanOrEqual(controls.width);
  await page.mouse.move(5, 5);
  await expect(page.locator(".story-volume__slider")).toHaveCSS("opacity", "0");
  await page.screenshot({ path: ".local/qa-volume-collapsed.png", fullPage: true });
  await page.getByRole("button", { name: copy.play, exact: true }).click();
  await expect(page.getByText(copy.finished)).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".story-viewer__notice")).toHaveCSS("opacity", "1");
  const playerBox = await page.locator(".story-viewer").boundingBox();
  expect(await page.locator(".story-viewer__notice").boundingBox()).toEqual(playerBox);
  await page.screenshot({ path: ".local/qa-full-player-overlay.png", fullPage: true });
  await page.getByRole("button", { name: copy.replay }).click();
  await expect(media).toHaveJSProperty("volume", 0.35);
  await expect(media).toHaveJSProperty("muted", false);
  await page.getByRole("button", { name: copy.pause, exact: true }).focus(); await page.keyboard.press("Space");
  await page.getByLabel(copy.label).fill("another_account");
  await page.getByRole("button", { name: copy.submit }).click();
  await expect(media).toHaveJSProperty("volume", 0.35);
  await expect(page.locator(".story-volume__slider")).toHaveValue("35");
});

test("screen tap navigation and hold cancellation do not skip image Stories", async ({ page }) => {
  const imageUrl = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="160"/>');
  const stories = [1, 2].map((id) => ({ id: String(id), type: "image", imageUrl, duration: 30, author: { username: "test_account", displayName: "Test account" } }));
  await page.route("**/api/tiktok/story?*", (route) => route.fulfill({ json: { success: true, username: "test_account", hasStory: true, stories } }));
  await page.goto("/");
  await page.getByLabel(copy.label).fill("test_account");
  await page.getByRole("button", { name: copy.submit }).click();
  const right = page.getByRole("button", { name: copy.next, exact: true });
  await expect(right.locator("svg")).toHaveCount(0);
  const box = await right.boundingBox();
  await page.mouse.move(box!.x + 20, box!.y + 180);
  await page.mouse.down();
  const progress = page.getByRole("progressbar", { name: copy.progress(1, 2), exact: true });
  const before = await progress.getAttribute("value");
  await page.waitForTimeout(450);
  expect(await progress.getAttribute("value")).toBe(before);
  await page.mouse.move(10, 10);
  await page.mouse.up();
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
  await right.click();
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(2, 2));
  await page.getByRole("button", { name: copy.previous, exact: true }).click();
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
});

test("empty results and loading", async ({ page }) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/tiktok/story?*", async (route) => { await wait; await route.fulfill({ json: { success: true, username: "example", hasStory: false, stories: [] } }); });
  await page.goto("/");
  await page.getByLabel(copy.label).fill("example");
  await page.getByRole("button", { name: copy.submit }).click();
  await expect(page.getByText(copy.loadingTitle)).toBeVisible();
  release();
  await expect(page.getByText(copy.emptyTitle)).toBeVisible();
});

test("image playback, pause, keyboard and automatic progression with test-only data", async ({ page }) => {
  const image = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="#365852"/></svg>');
  const stories = [1, 2].map((id) => ({ id: String(id), type: "image", imageUrl: image, duration: 2, author: { username: "test_account", displayName: "Test account" } }));
  await page.route("**/api/tiktok/story?*", (route) => route.fulfill({ json: { success: true, username: "test_account", hasStory: true, stories } }));
  await page.goto("/");
  await page.getByLabel(copy.label).fill("test_account");
  await page.getByRole("button", { name: copy.submit }).click();
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
  await page.getByRole("button", { name: copy.pause }).focus(); await page.keyboard.press("Space");
  await page.waitForTimeout(2200);
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
  await page.locator(".story-viewer").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(2, 2));
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(2, 2), { timeout: 4000 });
  await expect(page.getByText(copy.finished)).toBeVisible({ timeout: 4000 });
  await expect(page.locator(".story-viewer__notice")).toHaveCSS("opacity", "1");
  const playerBox = await page.locator(".story-viewer").boundingBox();
  expect(await page.locator(".story-viewer__notice").boundingBox()).toEqual(playerBox);
  await page.screenshot({ path: ".local/qa-full-player-overlay.png", fullPage: true });
  await page.getByRole("button", { name: copy.replay }).click();
  await expect(page.locator(".story-viewer__count")).toHaveText(copy.progress(1, 2));
});




test("Story view counts follow the active Story and distinguish zero from missing", async ({ page }) => {
  const imageUrl = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="160"/>');
  const stories = [18, 0, undefined].map((views, id) => ({ id: String(id), type: "image", imageUrl, duration: 30, views, author: { username: "example", displayName: "Example" } }));
  await page.route("**/api/tiktok/story?*", route => route.fulfill({ json: { success: true, username: "example", hasStory: true, stories } }));
  await page.goto("/");
  await page.getByLabel(copy.label).fill("example");
  await page.getByRole("button", { name: copy.submit }).click();
  const views = page.locator(".story-viewer__views");
  await expect(views).toHaveText(copy.storyViews(18));
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.locator(".story-viewer").scrollIntoViewIfNeeded();
    await expect(views).toBeVisible();
    const player = await page.locator(".story-viewer").boundingBox();
    const badge = await views.boundingBox();
    expect(badge!.x).toBeGreaterThan(player!.x);
    expect(badge!.x + badge!.width).toBeLessThan(player!.x + player!.width - 44);
    await page.screenshot({ path: `.local/qa-story-views-${width}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: copy.next, exact: true }).click();
  await expect(views).toHaveText(copy.storyViews(0));
  await page.getByRole("button", { name: copy.next, exact: true }).click();
  await expect(views).toHaveCount(0);
});
