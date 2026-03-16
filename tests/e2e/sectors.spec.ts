import { expect, test } from "@playwright/test";

test.describe("Sectors Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@neolyst.com");
    await page.fill('input[type="password"]', "Admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
  });

  test("sectors page loads and displays sectors", async ({ page }) => {
    await page.goto("/sectors");
    await expect(page.locator("header")).toContainText("Sectors");
    await expect(page.locator("table")).toBeVisible();
  });

  test("can create a level-1 (parent) sector", async ({ page }) => {
    await page.goto("/sectors");

    // Click create button
    await page.click('button:has-text("Create Sector")');

    // Wait for modal to open
    await expect(page.locator("role=dialog")).toBeVisible();

    // Fill form with level 1 (no parent)
    const timestamp = Date.now();
    await page.getByLabel("English Name").fill(`Test Sector L1 ${timestamp}`);
    await page.getByLabel("Chinese Name").fill("测试一级行业");
    // Use nth(1) to get the second Level select (inside the modal form)
    await page.getByLabel("Level").nth(1).selectOption("1");

    // Submit via keyboard
    await page.keyboard.press("Enter");

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Should see new sector in table
    await expect(page.locator("table")).toContainText(
      `Test Sector L1 ${timestamp}`,
      { timeout: 5000 },
    );
  });

  test("can create a level-2 (child) sector with parent", async ({ page }) => {
    await page.goto("/sectors");

    // First create a level-1 sector
    await page.click('button:has-text("Create Sector")');
    await expect(page.locator("role=dialog")).toBeVisible();
    const timestamp = Date.now();
    await page.getByLabel("English Name").fill(`Parent Sector ${timestamp}`);
    await page.getByLabel("Chinese Name").fill("父行业");
    await page.getByLabel("Level").nth(1).selectOption("1");
    await page.keyboard.press("Enter");
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Wait for page to refresh and show the new sector
    await expect(page.locator("table")).toContainText(
      `Parent Sector ${timestamp}`,
      { timeout: 5000 },
    );

    // Now create a level-2 sector with the parent
    await page.click('button:has-text("Create Sector")');
    await expect(page.locator("role=dialog")).toBeVisible();

    await page.getByLabel("English Name").fill(`Child Sector ${timestamp}`);
    await page.getByLabel("Chinese Name").fill("子行业");
    await page.getByLabel("Level").nth(1).selectOption("2");

    // Wait for parent sector dropdown to be populated
    await page.waitForTimeout(1000);

    // Select the first available parent (the one we just created)
    await page.getByLabel("Parent Sector").selectOption({ index: 1 });

    await page.keyboard.press("Enter");

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Should see child sector
    await expect(page.locator("table")).toContainText(
      `Child Sector ${timestamp}`,
      { timeout: 5000 },
    );
  });

  test("cannot create level-2 sector without parent", async ({ page }) => {
    await page.goto("/sectors");

    await page.click('button:has-text("Create Sector")');
    await expect(page.locator("role=dialog")).toBeVisible();

    // Select level-2 without selecting parent
    await page.getByLabel("English Name").fill("Orphan Sector");
    await page.getByLabel("Level").nth(1).selectOption("2");
    // Leave parent empty

    await page.keyboard.press("Enter");

    // Should show validation error
    await expect(page.locator("role=dialog")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=required")).toBeVisible({ timeout: 5000 });
  });

  test("can edit an existing sector", async ({ page }) => {
    await page.goto("/sectors");

    // Find first sector and click edit
    const row = page.locator("table tbody tr").first();
    await row.locator('button:has-text("Edit")').click();

    // Wait for modal
    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();

    // Update english name
    const timestamp = Date.now();
    await page.getByLabel("English Name").fill(`Updated Sector ${timestamp}`);
    await dialog.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Should see updated sector
    await expect(page.locator("table")).toContainText(
      `Updated Sector ${timestamp}`,
      { timeout: 5000 },
    );
  });

  test("can delete a sector with confirmation", async ({ page }) => {
    await page.goto("/sectors");

    // First create a sector to delete
    await page.click('button:has-text("Create Sector")');
    await expect(page.locator("role=dialog")).toBeVisible();

    const timestamp = Date.now();
    await page.getByLabel("English Name").fill(`Delete Test ${timestamp}`);
    await page.getByLabel("Chinese Name").fill("删除测试");
    await page.getByLabel("Level").nth(1).selectOption("1");
    await page.keyboard.press("Enter");
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

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
      "Sector deleted",
      { timeout: 5000 },
    );

    // Should refresh and sector should be gone
    await expect(page.locator("table")).not.toContainText(
      `Delete Test ${timestamp}`,
      { timeout: 10000 },
    );
  });

  test("search filters sectors by name", async ({ page }) => {
    await page.goto("/sectors");

    // Enter search query and submit form
    await page.fill('input[placeholder*="Search"]', "Technology");
    await page.keyboard.press("Enter");

    // URL should update with search params
    await expect(page).toHaveURL(/query=Technology/, { timeout: 5000 });
  });

  test("level filter works", async ({ page }) => {
    await page.goto("/sectors");

    // Select level 1 filter - auto-search on change
    await page.getByLabel("Level").first().selectOption("1");

    // URL should have level parameter (auto-search)
    await expect(page).toHaveURL(/level=1/, { timeout: 5000 });
  });

  test("non-admin cannot access sectors page", async ({ page, context }) => {
    // Create non-admin browser context (login as SA)
    const nonAdminPage = await context.newPage();
    await nonAdminPage.goto("/login");
    await nonAdminPage.fill('input[type="email"]', "sa@neolyst.com");
    await nonAdminPage.fill('input[type="password"]', "Analyst123");
    await nonAdminPage.click('button[type="submit"]');
    await expect(nonAdminPage).toHaveURL(/\/desktop/, { timeout: 15000 });

    // Try to access sectors
    await nonAdminPage.goto("/sectors");

    // Should redirect to 403
    await expect(nonAdminPage).toHaveURL(/\/403/, { timeout: 5000 });
    await expect(nonAdminPage.locator("body")).toContainText("No permission", {
      timeout: 5000,
    });
  });
});
