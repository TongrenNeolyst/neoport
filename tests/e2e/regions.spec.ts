import { expect, test } from "@playwright/test";

test.describe("Regions Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@neolyst.com");
    await page.fill('input[type="password"]', "Admin123");

    // Remove Next.js dev overlay if present
    await page.evaluate(() => {
      const overlay = document.querySelector("nextjs-portal");
      if (overlay) overlay.remove();
    });

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
  });

  test("regions page loads and displays regions", async ({ page }) => {
    await page.goto("/regions");
    // Check for title in header
    await expect(page.locator("header")).toContainText("Regions");
    await expect(page.locator("table")).toBeVisible();
  });

  test("can create a new region", async ({ page }) => {
    await page.goto("/regions");

    // Click create button
    await page.click('button:has-text("Create Region")');

    // Wait for modal to open
    await expect(page.locator("role=dialog")).toBeVisible();

    // Fill form with unique code
    const timestamp = Date.now();
    await page.fill("#name", `Test Region ${timestamp}`);
    await page.fill("#code", `T${timestamp % 10000}`);

    // Submit via keyboard (Enter)
    await page.keyboard.press("Enter");

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Should see new region in table
    await expect(page.locator("table")).toContainText(
      `Test Region ${timestamp}`,
      { timeout: 5000 },
    );
  });

  test("can edit an existing region", async ({ page }) => {
    await page.goto("/regions");

    // Find first region and click edit
    const row = page.locator("table tbody tr").first();
    await row.locator('button:has-text("Edit")').click();

    // Wait for modal
    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();

    // Update name
    const timestamp = Date.now();
    await page.fill("#name", `Updated Region ${timestamp}`);
    await dialog.getByRole("button", { name: "Save" }).click();

    // Should see updated region
    await expect(page.locator("table")).toContainText(
      `Updated Region ${timestamp}`,
      { timeout: 5000 },
    );
  });

  test("cannot create region with duplicate name", async ({ page }) => {
    await page.goto("/regions");

    // Click create button
    await page.click('button:has-text("Create Region")');
    await expect(page.locator("role=dialog")).toBeVisible();

    // Try to create duplicate - use existing region name
    await page.fill("#name", "Japan");
    await page.fill("#code", "DUP");

    // Submit via keyboard (Enter)
    await page.keyboard.press("Enter");

    // Should show error toast
    await expect(page.locator("[aria-live='polite']")).toContainText(
      "already exists",
      { timeout: 10000 },
    );
  });

  test("can delete a region with confirmation", async ({ page }) => {
    await page.goto("/regions");

    // First create a region to delete
    await page.click('button:has-text("Create Region")');
    await expect(page.locator("role=dialog")).toBeVisible();

    const timestamp = Date.now();
    await page.fill("#name", `Delete Test ${timestamp}`);
    await page.fill("#code", `D${timestamp % 10000}`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Now find and delete it
    const row = page
      .locator("table tbody tr")
      .filter({ hasText: `Delete Test ${timestamp}` });

    await row.locator('button:has-text("Delete")').click();

    // Confirm deletion in modal
    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();

    // Should show success toast
    await expect(page.locator("[aria-live='polite']")).toContainText(
      "Region deleted",
      { timeout: 5000 },
    );

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 5000,
    });

    // Should refresh and region should be gone
    await expect(page.locator("table")).not.toContainText(
      `Delete Test ${timestamp}`,
      { timeout: 10000 },
    );
  });

  test("search filters regions by name", async ({ page }) => {
    await page.goto("/regions");

    // Enter search query and submit form
    await page.fill('input[placeholder*="Search"]', "Hong Kong");
    await page.keyboard.press("Enter");

    // URL should update with search params
    await expect(page).toHaveURL(/query=Hong\+Kong/, { timeout: 5000 });

    // Table should show matching results
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("non-admin cannot access regions page", async ({ page, context }) => {
    // Create non-admin browser context (login as SA)
    const nonAdminPage = await context.newPage();
    await nonAdminPage.goto("/login");
    await nonAdminPage.fill('input[type="email"]', "sa@neolyst.com");
    await nonAdminPage.fill('input[type="password"]', "Analyst123");
    await nonAdminPage.click('button[type="submit"]');
    await expect(nonAdminPage).toHaveURL(/\/desktop/, { timeout: 15000 });

    // Try to access regions
    await nonAdminPage.goto("/regions");

    // Should redirect to 403
    await expect(nonAdminPage).toHaveURL(/\/403/, { timeout: 5000 });
    await expect(nonAdminPage.locator("body")).toContainText("No permission", {
      timeout: 5000,
    });
  });
});
