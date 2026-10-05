import { expect, type Page } from "@playwright/test";

import { readState } from "./support";

export async function loginAsAdmin(page: Page) {
  const { adminEmail, adminPassword } = readState();
  await page.goto("/admin/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Navigates and waits until the page has hydrated, so typing is not reset by React taking over. */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
