import { expect, test } from "@playwright/test";

test.describe("Desktop Navigation", () => {
  test.describe("Admin User", () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto("/login");
      await page.fill('input[type="email"]', "admin@neolyst.com");
      await page.fill('input[type="password"]', "Admin123");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
    });

    test("displays all admin-visible cards on desktop", async ({ page }) => {
      // Check Reports section for Templates (Admin-only)
      const reportsSection = page.locator(
        'section:has(h2:has-text("Reports"))',
      );
      await expect(
        reportsSection.locator('a:has-text("Templates")'),
      ).toBeVisible();
      await expect(
        reportsSection.locator('a:has-text("Templates")'),
      ).toHaveAttribute("href", "/templates");

      // Check Data Management section
      const dataSection = page.locator(
        'section:has(h2:has-text("Data Management"))',
      );

      // Should have Regions card
      await expect(dataSection.locator('a:has-text("Regions")')).toBeVisible();
      await expect(
        dataSection.locator('a:has-text("Regions")'),
      ).toHaveAttribute("href", "/regions");

      // Should have Analyst Info card
      await expect(
        dataSection.locator('a:has-text("Analyst Info")'),
      ).toBeVisible();
      await expect(
        dataSection.locator('a:has-text("Analyst Info")'),
      ).toHaveAttribute("href", "/analyst-info");

      // Should have User Management card
      await expect(
        dataSection.locator('a:has-text("User Management")'),
      ).toBeVisible();

      // Should have Sectors card (Admin-only)
      await expect(dataSection.locator('a:has-text("Sectors")')).toBeVisible();
      await expect(
        dataSection.locator('a:has-text("Sectors")'),
      ).toHaveAttribute("href", "/sectors");

      // Should have Coverage card
      await expect(dataSection.locator('a:has-text("Coverage")')).toBeVisible();
      await expect(
        dataSection.locator('a:has-text("Coverage")'),
      ).toHaveAttribute("href", "/coverage");
    });

    test("cards open in new tab when clicked", async ({ page }) => {
      // Click Regions card
      const [regionsTab] = await Promise.all([
        page.waitForEvent("popup"),
        page.locator('a:has-text("Regions")').click(),
      ]);

      // Should open new tab
      await expect(regionsTab).toBeTruthy();

      // Close tab
      await regionsTab.close();
    });

    test("coming soon features are marked correctly", async ({ page }) => {
      // Check that some cards still show "Coming Soon"
      const badges = page.locator(
        'section:has(h2:has-text("Reports")) span:has-text("Coming Soon")',
      );

      await expect(badges.first()).toBeVisible();
    });
  });

  test.describe("Non-Admin User (SA/Analyst)", () => {
    test("does not display Admin-only cards but can see Coverage", async ({
      page,
    }) => {
      // Login as SA
      await page.goto("/login");
      await page.fill('input[type="email"]', "sa@neolyst.com");
      await page.fill('input[type="password"]', "Analyst123");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });

      // Check Reports section - Templates should NOT be visible
      const reportsSection = page.locator(
        'section:has(h2:has-text("Reports"))',
      );
      await expect(
        reportsSection.locator('a:has-text("Templates")'),
      ).not.toBeVisible();

      // Data Management section should NOT have Admin-only cards
      const dataSection = page.locator(
        'section:has(h2:has-text("Data Management"))',
      );

      // Should NOT see User Management card (admin only)
      await expect(
        dataSection.locator('a:has-text("User Management")'),
      ).not.toBeVisible();

      // Should NOT see Regions card (admin only)
      await expect(
        dataSection.locator('a:has-text("Regions")'),
      ).not.toBeVisible();

      // Should NOT see Analyst Info card (admin only)
      await expect(
        dataSection.locator('a:has-text("Analyst Info")'),
      ).not.toBeVisible();

      // Should NOT see Sectors card (admin only)
      await expect(
        dataSection.locator('a:has-text("Sectors")'),
      ).not.toBeVisible();

      // SHOULD see Coverage card (admin + sa + analyst)
      await expect(dataSection.locator('a:has-text("Coverage")')).toBeVisible();
      await expect(
        dataSection.locator('a:has-text("Coverage")'),
      ).toHaveAttribute("href", "/coverage");
    });

    test("can access coverage page but not admin-only pages", async ({
      page,
    }) => {
      // Login as SA
      await page.goto("/login");
      await page.fill('input[type="email"]', "sa@neolyst.com");
      await page.fill('input[type="password"]', "Analyst123");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });

      // Should be able to access /coverage
      await page.goto("/coverage");
      await expect(page).toHaveURL(/\/coverage/, { timeout: 5000 });
      await expect(page.locator("header")).toContainText("Coverage");

      // Should NOT be able to access /sectors (redirects to 403)
      await page.goto("/sectors");
      await expect(page).toHaveURL(/\/403/, { timeout: 5000 });

      // Should NOT be able to access /templates (redirects to 403)
      await page.goto("/templates");
      await expect(page).toHaveURL(/\/403/, { timeout: 5000 });
    });
  });

  test.describe("Unauthenticated User", () => {
    test("redirects to login when accessing desktop", async ({ page }) => {
      await page.goto("/desktop");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  });
});
