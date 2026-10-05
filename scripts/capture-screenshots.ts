/**
 * Captures the README screenshots from a running app (local Supabase + `npm run start`/`dev`).
 *
 *   SCREENSHOT_ADMIN_EMAIL=owner@example.com SCREENSHOT_ADMIN_PASSWORD=... npm run screenshots
 *
 * Optional: SCREENSHOT_BASE_URL (default http://localhost:3000), E2E_CHROMIUM_PATH.
 * All data on screen is the fictional demo seed. The script makes one real booking through the
 * public form so the confirmation page can be captured; run it against a demo database only.
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const email = process.env.SCREENSHOT_ADMIN_EMAIL;
const password = process.env.SCREENSHOT_ADMIN_PASSWORD;
const outDir = resolve(process.cwd(), "docs/screenshots");

if (!email || !password) {
  console.error("Set SCREENSHOT_ADMIN_EMAIL and SCREENSHOT_ADMIN_PASSWORD.");
  process.exit(1);
}
const adminEmail: string = email;
const adminPassword: string = password;

mkdirSync(outDir, { recursive: true });

async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage });
  console.log(`captured ${name}`);
}

async function main() {
  const browser = await chromium.launch(
    process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  );

  // ---- Desktop -----------------------------------------------------------------------------------
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();

  await page.goto(`${baseUrl}/`);
  await shot(page, "home-desktop");
  await page.goto(`${baseUrl}/services`);
  await shot(page, "services-desktop");
  await page.goto(`${baseUrl}/doctors`);
  await shot(page, "doctors-desktop");

  // A real booking through the public form, to capture the date/time step and the confirmation.
  await page.goto(`${baseUrl}/book`);
  await page.waitForLoadState("networkidle");
  await page.getByTestId("service-general-consultation").click();
  await page.getByTestId("step-next").click();
  await page.getByTestId("doctor-dr-meera-iyer").click();
  await page.getByTestId("step-next").click();
  await page.locator('button[data-date]:not([aria-disabled="true"])').nth(1).click();
  await page.locator('input[name="slot"]').nth(1).check({ force: true });
  await page.waitForTimeout(300);
  await shot(page, "booking-date-time-desktop");
  await page.getByTestId("step-next").click();
  await page.getByLabel("Full name").fill("Anika Sharma");
  await page.getByLabel("Mobile number").fill("98765 43211");
  await page.getByLabel("Reason for visit").fill("Routine check-up");
  await page.getByLabel(/I agree that/).check();
  await shot(page, "booking-details-desktop");
  await page.getByTestId("step-next").click();
  await shot(page, "booking-review-desktop");
  await page.waitForTimeout(3300);
  await page.getByTestId("step-next").click();
  await page.waitForURL("**/book/confirmation/**");
  await shot(page, "confirmation-desktop");

  // Administrator
  await page.goto(`${baseUrl}/admin/login`);
  await shot(page, "admin-login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
  await shot(page, "admin-dashboard");
  await page.goto(`${baseUrl}/admin/appointments`);
  await shot(page, "admin-appointments");
  await page.locator('a[href^="/admin/appointments/"]').first().click();
  await shot(page, "admin-appointment-detail");
  await page.goto(`${baseUrl}/admin/schedule`);
  await shot(page, "admin-schedule");
  await page.goto(`${baseUrl}/admin/events`);
  await shot(page, "admin-events");
  await desktop.close();

  // ---- Mobile ------------------------------------------------------------------------------------
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  await phone.goto(`${baseUrl}/`);
  await shot(phone, "home-mobile");
  await phone.goto(`${baseUrl}/book?service=general-consultation&doctor=dr-meera-iyer`);
  await phone.locator('button[data-date]:not([aria-disabled="true"])').nth(1).click();
  await phone.locator('input[name="slot"]').nth(1).check({ force: true });
  await shot(phone, "booking-mobile");
  await mobile.close();

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
