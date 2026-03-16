import { expect, test } from "@playwright/test";

test.describe("Auth Flow", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message (toast or inline)
    await expect(page.locator("p.text-red-500")).toContainText(
      "Invalid email or password",
      { timeout: 5000 },
    );
  });

  test("login with valid credentials redirects to desktop", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "admin@neolyst.com");
    await page.fill('input[type="password"]', "Admin123");
    await page.click('button[type="submit"]');

    // Should redirect to desktop
    await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
  });

  test("protected route redirects to login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/desktop");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("users page is protected", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
