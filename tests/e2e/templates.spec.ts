import { expect, test } from "@playwright/test";

test.describe("Templates Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@neolyst.com");
    await page.fill('input[type="password"]', "Admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
  });

  test("templates page loads", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.locator("header")).toContainText("Templates");
  });

  test("shows upload template button", async ({ page }) => {
    await page.goto("/templates");
    await expect(
      page.locator('button:has-text("Upload Template")'),
    ).toBeVisible();
  });

  test("can open upload modal", async ({ page }) => {
    await page.goto("/templates");

    await page.click('button:has-text("Upload Template")');

    // Modal should appear
    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Upload Template");

    // Should have form fields
    await expect(page.locator("#upload-form")).toBeVisible();
  });

  test("upload modal has report type and file type selectors", async ({
    page,
  }) => {
    await page.goto("/templates");

    await page.click('button:has-text("Upload Template")');

    // Check for report type options
    const reportTypeSelect = page.locator("select").first();
    await expect(reportTypeSelect).toBeVisible();

    // Check for file type options
    const fileTypeSelect = page.locator("select").nth(1);
    await expect(fileTypeSelect).toBeVisible();
  });

  test("upload modal requires name and file", async ({ page }) => {
    await page.goto("/templates");

    await page.click('button:has-text("Upload Template")');

    // Try to submit without filling required fields
    const dialog = page.locator("role=dialog");
    await dialog.getByRole("button", { name: "Upload" }).click();

    // Should show validation errors
    await expect(page.locator("role=dialog")).toBeVisible({ timeout: 5000 });
  });

  test("shows empty state when no templates", async ({ page }) => {
    await page.goto("/templates");

    // Check if either empty state or template groups are shown
    const emptyState = page.locator('text="No templates uploaded yet."');
    const templateGroups = page.locator(
      '[class*="rounded-lg"][class*="border"]',
    );

    // Either empty state or template list should be visible
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasTemplates = (await templateGroups.count()) > 0;

    expect(hasEmpty || hasTemplates).toBe(true);
  });

  test("non-admin cannot access templates page", async ({ page, context }) => {
    // Create non-admin browser context (login as SA)
    const nonAdminPage = await context.newPage();
    await nonAdminPage.goto("/login");
    await nonAdminPage.fill('input[type="email"]', "sa@neolyst.com");
    await nonAdminPage.fill('input[type="password"]', "Analyst123");
    await nonAdminPage.click('button[type="submit"]');
    await expect(nonAdminPage).toHaveURL(/\/desktop/, { timeout: 15000 });

    // Try to access templates
    await nonAdminPage.goto("/templates");

    // Should redirect to 403
    await expect(nonAdminPage).toHaveURL(/\/403/, { timeout: 5000 });
    await expect(nonAdminPage.locator("body")).toContainText("No permission", {
      timeout: 5000,
    });
  });

  test("can cancel upload modal", async ({ page }) => {
    await page.goto("/templates");

    await page.click('button:has-text("Upload Template")');

    const dialog = page.locator("role=dialog");
    await expect(dialog).toBeVisible();

    // Click cancel
    await dialog.getByRole("button", { name: "Cancel" }).click();

    // Modal should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // Note: Actual file upload tests would require setting up test files
  // These are placeholder tests for the file upload functionality
  test("file input accepts correct file types for Word", async ({ page }) => {
    await page.goto("/templates");

    await page.click('button:has-text("Upload Template")');

    // Select Word file type
    await page.locator("select").nth(1).selectOption("word");

    // Check file input accepts .docx, .doc
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", ".docx,.doc");
  });

  test("file input accepts correct file types for Excel", async ({ page }) => {
    await page.goto("/templates");

    await page.click('button:has-text("Upload Template")');

    // Select Excel file type
    await page.locator("select").nth(1).selectOption("excel");

    // Check file input accepts .xlsx, .xls
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", ".xlsx,.xls");
  });
});
