import { Page } from "@playwright/test";

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Remove Next.js dev overlay if present
  await page.evaluate(() => {
    const overlay = document.querySelector("nextjs-portal");
    if (overlay) overlay.remove();
  });

  await page.click('button[type="submit"]');
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, "admin@neolyst.com", "Admin123");
}

export async function loginAsSA(page: Page): Promise<void> {
  await loginAs(page, "sa@neolyst.com", "Analyst123");
}

export async function loginAsAnalyst(page: Page): Promise<void> {
  await loginAs(page, "analyst@neolyst.com", "Analyst123");
}
