import { expect, test } from "@playwright/test";

test.describe("评论墙未登录视觉回归", () => {
  test.use({ viewport: { width: 1820, height: 1010 } });

  test("未登录时保留评论墙内容和右上登录入口", async ({ context, page }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.route("**/comments?**", async (route) => {
      const request = route.request();

      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      await route.fulfill({
        contentType: "application/json",
        json: {
          total: 1,
          limit: 500,
          offset: 0,
          items: [
            {
              id: 1001,
              content: "<p>未登录也能看到这条建议</p>",
              x: 1800,
              y: 1200,
              rotation: -8,
              color: "purple",
              likeCount: 3,
              likedByMe: false,
              author: {
                id: 2001,
                displayName: "测试用户",
                avatarUrl: "",
              },
              createdAt: "2026-04-20 15:23:32",
              updatedAt: "2026-04-20 15:23:32",
            },
          ],
        },
      });
    });

    await page.goto("/");

    const registerButton = page.getByRole("button", { name: "注册" });
    const loginButton = page.getByRole("button", { name: "登录" });
    const fixtureCommentCard = page
      .locator('[data-comment-card="true"]')
      .filter({ hasText: "未登录也能看到这条建议" })
      .last();

    await expect(registerButton).toBeVisible();
    await expect(loginButton).toBeVisible();
    await expect(page.getByText("登录后可发表评论、点赞与拖动自己的贴纸")).toBeVisible();
    await expect(fixtureCommentCard).toBeVisible();

    const sidebarBox = await page.locator("aside").boundingBox();
    const registerBox = await registerButton.boundingBox();
    const loginBox = await loginButton.boundingBox();

    expect(sidebarBox?.width).toBeCloseTo(72, 0);
    expect(registerBox?.width).toBeCloseTo(100, 0);
    expect(registerBox?.height).toBeCloseTo(40, 0);
    expect(loginBox?.width).toBeCloseTo(100, 0);
    expect(loginBox?.height).toBeCloseTo(40, 0);
  });
});
