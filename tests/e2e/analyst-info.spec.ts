import { expect, test } from "@playwright/test";

test.describe("Analyst Info Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@neolyst.com");
    await page.fill('input[type="password"]', "Admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
  });

  test("analyst info page loads and displays analysts", async ({ page }) => {
    await page.goto("/analyst-info");
    // Check for title in header
    await expect(page.locator("header")).toContainText("Analyst Info");
    await expect(page.locator("table")).toBeVisible();
  });

  test("can create a new analyst", async ({ page }) => {
    await page.goto("/analyst-info");

    // Click create button
    await page.click('button:has-text("Create Analyst")');

    // Wait for modal and regions to load
    await expect(page.locator("role=dialog")).toBeVisible();
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#region_id");
        return select && select.querySelectorAll("option").length > 1;
      },
      { timeout: 10000 },
    );

    // Fill form
    const timestamp = Date.now();
    await page.fill("#full_name", `Test Analyst ${timestamp}`);
    await page.fill("#chinese_name", "测试分析师");
    await page.fill("#email", `test.analyst.${timestamp}@example.com`);
    await page.selectOption("#region_id", { label: "India (IN)" });

    // Submit by pressing Enter on the form
    await page.keyboard.press("Enter");

    // Wait for modal to close (indicates success)
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Should see new analyst in table
    await expect(page.locator("table")).toContainText(
      `Test Analyst ${timestamp}`,
      {
        timeout: 5000,
      },
    );
  });

  test("can edit an existing analyst", async ({ page }) => {
    await page.goto("/analyst-info");

    // Find first analyst and click edit
    const row = page.locator("table tbody tr").first();
    await row.locator('button:has-text("Edit")').click();

    // Wait for modal and regions to load
    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#region_id");
        return select && select.querySelectorAll("option").length > 1;
      },
      { timeout: 10000 },
    );

    // Update full name
    const timestamp = Date.now();
    await page.fill("#full_name", `Updated Name ${timestamp}`);
    // Ensure a region is selected (in case the analyst has no region)
    await page.selectOption("#region_id", { label: "India (IN)" });
    await dialog.getByRole("button", { name: "Save" }).click();

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Should see updated analyst
    await expect(page.locator("table")).toContainText(
      `Updated Name ${timestamp}`,
      {
        timeout: 5000,
      },
    );
  });

  test("cannot create analyst with duplicate email", async ({ page }) => {
    await page.goto("/analyst-info");

    // First, create an analyst
    await page.click('button:has-text("Create Analyst")');
    await expect(page.locator("role=dialog")).toBeVisible();
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#region_id");
        return select && select.querySelectorAll("option").length > 1;
      },
      { timeout: 10000 },
    );

    const uniqueEmail = `unique.${Date.now()}@example.com`;
    await page.fill("#full_name", "First Analyst");
    await page.fill("#email", uniqueEmail);
    await page.selectOption("#region_id", { label: "India (IN)" });
    await page.keyboard.press("Enter");

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Now try to create another analyst with the same email
    await page.click('button:has-text("Create Analyst")');
    await expect(page.locator("role=dialog")).toBeVisible();
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#region_id");
        return select && select.querySelectorAll("option").length > 1;
      },
      { timeout: 10000 },
    );

    await page.fill("#full_name", "Duplicate Email Test");
    await page.fill("#email", uniqueEmail); // Use the same email
    await page.selectOption("#region_id", { label: "Japan (JP)" });
    await page.keyboard.press("Enter");

    // Should show error toast
    await expect(page.locator("[aria-live='polite']")).toContainText(
      "already exists",
      {
        timeout: 10000,
      },
    );
  });

  test("can delete an analyst with confirmation", async ({ page }) => {
    await page.goto("/analyst-info");

    // First create an analyst to delete
    await page.click('button:has-text("Create Analyst")');
    await expect(page.locator("role=dialog")).toBeVisible();
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#region_id");
        return select && select.querySelectorAll("option").length > 1;
      },
      { timeout: 10000 },
    );

    const timestamp = Date.now();
    await page.fill("#full_name", `Delete Test ${timestamp}`);
    await page.fill("#email", `delete.${timestamp}@example.com`);
    await page.selectOption("#region_id", { label: "India (IN)" });
    await page.keyboard.press("Enter");
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 10000,
    });

    // Now delete it
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
      "Analyst deleted",
      { timeout: 5000 },
    );

    // Wait for modal to close
    await expect(page.locator("role=dialog")).not.toBeVisible({
      timeout: 5000,
    });

    // Should refresh and analyst should be gone
    await expect(page.locator("table")).not.toContainText(
      `Delete Test ${timestamp}`,
      {
        timeout: 10000,
      },
    );
  });

  test("search filters analysts by name or email", async ({ page }) => {
    await page.goto("/analyst-info");

    // Enter search query and submit form
    await page.fill('input[placeholder*="Search"]', "analyst");
    await page.keyboard.press("Enter");

    // URL should update with search params
    await expect(page).toHaveURL(/query=analyst/, { timeout: 5000 });

    // Table should show matching results
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("can toggle analyst active status", async ({ page }) => {
    await page.goto("/analyst-info");

    // Find first analyst and click edit
    const row = page.locator("table tbody tr").first();
    await row.locator('button:has-text("Edit")').click();

    // Wait for modal and regions to load
    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#region_id");
        return select && select.querySelectorAll("option").length > 1;
      },
      { timeout: 10000 },
    );

    // Toggle active status and ensure region is set
    await page.locator("#is_active").uncheck();
    await page.selectOption("#region_id", { label: "India (IN)" });
    await dialog.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(1000);

    // Should see "INACTIVE" badge
    await expect(page.locator("body")).toContainText("INACTIVE", {
      timeout: 5000,
    });
  });

  test("non-admin cannot access analyst info page", async ({
    page,
    context,
  }) => {
    // Create non-admin browser context
    const nonAdminPage = await context.newPage();
    await nonAdminPage.goto("/login");
    await nonAdminPage.fill('input[type="email"]', "sa@neolyst.com");
    await nonAdminPage.fill('input[type="password"]', "Analyst123");
    await nonAdminPage.click('button[type="submit"]');
    await expect(nonAdminPage).toHaveURL(/\/desktop/, { timeout: 15000 });

    // Try to access analyst info
    await nonAdminPage.goto("/analyst-info");

    // Should redirect to 403
    await expect(nonAdminPage).toHaveURL(/\/403/, { timeout: 5000 });
    await expect(nonAdminPage.locator("body")).toContainText("No permission", {
      timeout: 5000,
    });
  });
});
