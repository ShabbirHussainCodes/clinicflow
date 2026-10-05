import { expect, test } from "@playwright/test";

import { loginAsAdmin } from "./auth";
import { readState } from "./support";

test.describe("administrator authentication", () => {
  test("anonymous visitors are redirected to the login page from every admin route", async ({ page }) => {
    for (const path of ["/admin", "/admin/appointments", "/admin/schedule", "/admin/events"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test("login validates input and shows a generic error for wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();

    await page.getByLabel("Email address").fill(readState().adminEmail);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("login-error")).toContainText("wasn't recognised");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a valid Supabase account that is not an administrator cannot sign in", async ({ page }) => {
    const { outsiderEmail, outsiderPassword } = readState();
    await page.goto("/admin/login");
    await page.getByLabel("Email address").fill(outsiderEmail);
    await page.getByLabel("Password").fill(outsiderPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("login-error")).toContainText("wasn't recognised");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("an administrator can sign in, see the dashboard and sign out securely", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
    await expect(page.getByTestId("stat-today")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/appointments");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("open redirects through the login page are ignored", async ({ page }) => {
    const { adminEmail, adminPassword } = readState();
    await page.goto("/admin/login?next=//evil.example.com");
    await page.getByLabel("Email address").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/admin$/);
  });
});
