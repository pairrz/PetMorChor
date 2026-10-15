import { expect, test } from "@playwright/test";

test.describe("login flow", () => {
  test("redirects visitors from protected pages to login", async ({ page }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fprofile$/);
    await expect(
      page.getByRole("heading", { name: "เข้าสู่ระบบ Pet MorChor" })
    ).toBeVisible();
  });

  test("requires email and password before submitting", async ({ page }) => {
    let loginRequestCount = 0;
    await page.route("**/api/auth/login", async (route) => {
      loginRequestCount += 1;
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        }),
      });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "เข้าสู่ระบบด้วยอีเมล" }).click();

    await expect(page.getByLabel("อีเมล")).toBeFocused();
    expect(loginRequestCount).toBe(0);
  });

  test("shows an error after the login API rejects credentials", async ({ page }) => {
    let submittedCredentials: unknown;
    await page.route("**/api/auth/login", async (route) => {
      submittedCredentials = route.request().postDataJSON();
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("อีเมล").fill("unknown@example.com");
    await page.getByLabel("รหัสผ่าน").fill("wrong-password");
    await page.getByRole("button", { name: "เข้าสู่ระบบด้วยอีเมล" }).click();

    await expect(
      page.getByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    ).toBeVisible();
    expect(submittedCredentials).toEqual({
      email: "unknown@example.com",
      password: "wrong-password",
    });
    await expect(page).toHaveURL(/\/login$/);
  });
});
