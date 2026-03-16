import { expect, test } from "@playwright/test";

test.describe("Coverage Management", () => {
  test.describe("Admin User", () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto("/login");
      await page.fill('input[type="email"]', "admin@neolyst.com");
      await page.fill('input[type="password"]', "Admin123");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
    });

    test("coverage page loads and displays coverages", async ({ page }) => {
      await page.goto("/coverage");
      await expect(page.locator("header")).toContainText("Coverage");
      await expect(page.locator("table")).toBeVisible();
    });

    test("can create a new coverage with analysts", async ({ page }) => {
      await page.goto("/coverage");

      // Click create button
      await page.click('button:has-text("Create Coverage")');

      // Wait for modal to open
      await expect(page.locator("role=dialog")).toBeVisible();

      // Fill form
      const timestamp = Date.now();
      await page.getByLabel("Ticker *").fill(`${timestamp % 10000} HK`);
      await page
        .getByLabel("ISIN *")
        .fill(`KYG${timestamp.toString().slice(-9)}`);
      await page.getByLabel("Country of Domicile *").fill("Hong Kong");
      await page
        .getByLabel("English Full Name *")
        .fill(`Test Company ${timestamp}`);

      // Select a sector (first available)
      await page.getByLabel("Sector *").selectOption({ index: 1 });

      // Select first analyst
      await page.getByLabel("Analyst").selectOption({ index: 1 });

      // Submit
      await page.keyboard.press("Enter");

      // Wait for modal to close
      await expect(page.locator("role=dialog")).not.toBeVisible({
        timeout: 10000,
      });

      // Should see new coverage in table
      await expect(page.locator("table")).toContainText(
        `${timestamp % 10000} HK`,
        { timeout: 5000 },
      );
    });

    test("can add multiple analysts (up to 4)", async ({ page }) => {
      await page.goto("/coverage");

      await page.click('button:has-text("Create Coverage")');
      await expect(page.locator("role=dialog")).toBeVisible();

      // Fill required fields
      const timestamp = Date.now();
      await page.getByLabel("Ticker *").fill(`M${timestamp % 10000} HK`);
      await page
        .getByLabel("ISIN *")
        .fill(`KYG${timestamp.toString().slice(-9)}`);
      await page.getByLabel("Country of Domicile *").fill("Hong Kong");
      await page
        .getByLabel("English Full Name *")
        .fill(`Multi Analyst Test ${timestamp}`);
      await page.getByLabel("Sector *").selectOption({ index: 1 });

      // Click "Add Analyst" button 3 times to get 4 analysts total
      const addButton = page.locator('button:has-text("+ Add Analyst")');

      // Should be able to add up to 4
      for (let i = 0; i < 3; i++) {
        await addButton.click();
        await page.waitForTimeout(200);
      }

      // Should NOT be able to add more than 4
      await expect(addButton).not.toBeVisible();
    });

    test("can edit an existing coverage", async ({ page }) => {
      await page.goto("/coverage");

      // Check if there are any coverages to edit
      const rows = page.locator("table tbody tr");
      const rowCount = await rows.count();

      if (rowCount > 0) {
        const firstRow = rows.first();
        await firstRow.locator('button:has-text("Edit")').click();

        // Wait for modal
        const dialog = page.locator("role=dialog");
        await expect(dialog).toBeVisible();

        // Update english name
        const timestamp = Date.now();
        await page
          .getByLabel("English Full Name *")
          .fill(`Updated Coverage ${timestamp}`);
        await dialog.getByRole("button", { name: "Save" }).click();

        // Wait for modal to close
        await expect(page.locator("role=dialog")).not.toBeVisible({
          timeout: 10000,
        });

        // Should see updated coverage
        await expect(page.locator("table")).toContainText(
          `Updated Coverage ${timestamp}`,
          { timeout: 5000 },
        );
      } else {
        // Skip test if no coverages exist
        test.skip();
      }
    });

    test("can delete a coverage with confirmation", async ({ page }) => {
      await page.goto("/coverage");

      // First create a coverage to delete
      await page.click('button:has-text("Create Coverage")');
      await expect(page.locator("role=dialog")).toBeVisible();

      const timestamp = Date.now();
      await page.getByLabel("Ticker *").fill(`D${timestamp % 10000} HK`);
      await page
        .getByLabel("ISIN *")
        .fill(`KYG${timestamp.toString().slice(-9)}`);
      await page.getByLabel("Country of Domicile *").fill("Hong Kong");
      await page
        .getByLabel("English Full Name *")
        .fill(`Delete Test ${timestamp}`);
      await page.getByLabel("Sector *").selectOption({ index: 1 });
      await page.getByLabel("Analyst").selectOption({ index: 1 });

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
        "Coverage deleted",
        { timeout: 5000 },
      );

      // Should refresh and coverage should be gone
      await expect(page.locator("table")).not.toContainText(
        `Delete Test ${timestamp}`,
        { timeout: 10000 },
      );
    });

    test("search filters coverage by ticker or name", async ({ page }) => {
      await page.goto("/coverage");

      // Enter search query and submit form
      await page.getByLabel("Search").fill("700");
      await page.keyboard.press("Enter");

      // URL should update with search params
      await expect(page).toHaveURL(/query=700/, { timeout: 5000 });
    });

    test("filter by sector works", async ({ page }) => {
      await page.goto("/coverage");

      // Select a sector from the dropdown - auto-search on change
      await page.getByLabel("Sector").first().selectOption({ index: 1 });

      // URL should have sector_id parameter (auto-search)
      await expect(page).toHaveURL(/sector_id=/, { timeout: 5000 });
    });

    test("required fields validation works", async ({ page }) => {
      await page.goto("/coverage");

      await page.click('button:has-text("Create Coverage")');
      await expect(page.locator("role=dialog")).toBeVisible();

      // Submit without filling required fields - should fail validation
      await page.keyboard.press("Enter");

      // Modal should remain open (validation failed)
      // Wait a bit to ensure form had time to process
      await page.waitForTimeout(500);
      await expect(page.locator("role=dialog")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Analyst User (SA)", () => {
    test.beforeEach(async ({ page }) => {
      // Login as SA (analyst role)
      await page.goto("/login");
      await page.fill('input[type="email"]', "sa@neolyst.com");
      await page.fill('input[type="password"]', "Analyst123");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/desktop/, { timeout: 15000 });
    });

    test("can access coverage page", async ({ page }) => {
      await page.goto("/coverage");
      await expect(page.locator("header")).toContainText("Coverage");
      await expect(page.locator("table")).toBeVisible();
    });

    test("can create a new coverage", async ({ page }) => {
      await page.goto("/coverage");

      // Click create button
      await page.click('button:has-text("Create Coverage")');

      // Wait for modal to open
      await expect(page.locator("role=dialog")).toBeVisible();

      // Fill form
      const timestamp = Date.now();
      await page.getByLabel("Ticker *").fill(`A${timestamp % 10000} HK`);
      await page
        .getByLabel("ISIN *")
        .fill(`KYG${timestamp.toString().slice(-9)}`);
      await page.getByLabel("Country of Domicile *").fill("Hong Kong");
      await page
        .getByLabel("English Full Name *")
        .fill(`Analyst Created ${timestamp}`);
      await page.getByLabel("Sector *").selectOption({ index: 1 });
      await page.getByLabel("Analyst").selectOption({ index: 1 });

      // Submit
      await page.keyboard.press("Enter");

      // Wait for modal to close
      await expect(page.locator("role=dialog")).not.toBeVisible({
        timeout: 10000,
      });

      // Should see new coverage in table
      await expect(page.locator("table")).toContainText(
        `Analyst Created ${timestamp}`,
        { timeout: 5000 },
      );
    });

    test("cannot see edit or delete buttons", async ({ page }) => {
      await page.goto("/coverage");

      // Look for edit/delete buttons - should not exist
      const editButtons = page.locator('button:has-text("Edit")');
      const deleteButtons = page.locator('button:has-text("Delete")');

      // Edit and Delete buttons should not be visible for analyst
      await expect(editButtons.first()).not.toBeVisible({ timeout: 5000 });
      await expect(deleteButtons.first()).not.toBeVisible({ timeout: 5000 });
    });
  });
});
