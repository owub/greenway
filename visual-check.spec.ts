import { expect, test } from "@playwright/test";

const baseUrl = "http://127.0.0.1:5173";

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        viewportWidth,
      }))
      .slice(0, 10);
  });

  expect(overflow).toEqual([]);
}

async function assertArchive(page: import("@playwright/test").Page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Recent moments" }),
  ).toBeVisible();
  await expect(page.locator(".video-card")).toHaveCount(5);
  await expect(page.locator(".snap-handle").first()).toContainText(
    "@ekampreet.16",
  );

  const videoStates = await page.locator(".video-card video").evaluateAll(
    (videos) =>
      videos.map((video) => {
        const element = video as HTMLVideoElement;
        return {
          currentSrc: element.currentSrc,
          readyState: element.readyState,
          width: element.videoWidth,
          height: element.videoHeight,
        };
      }),
  );
  expect(videoStates.every((video) => video.currentSrc)).toBeTruthy();
  expect(videoStates.every((video) => video.readyState >= 1)).toBeTruthy();
  expect(videoStates.every((video) => video.width > 0 && video.height > 0)).toBe(
    true,
  );
  await assertNoHorizontalOverflow(page);
}

test("desktop archive and live snaps states", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await assertArchive(page);
  await page.screenshot({
    path: "/tmp/greenway-desktop-archive.png",
    fullPage: true,
  });

  await page.getByRole("tab", { name: /Live snaps/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "See the latest from @ekampreet.16",
    }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: "/tmp/greenway-desktop-snaps.png",
    fullPage: true,
  });
});

test("mobile archive and live snaps states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertArchive(page);
  await page.screenshot({
    path: "/tmp/greenway-mobile-archive.png",
    fullPage: true,
  });

  await page.getByRole("tab", { name: /Live snaps/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "See the latest from @ekampreet.16",
    }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: "/tmp/greenway-mobile-snaps.png",
    fullPage: true,
  });
});
