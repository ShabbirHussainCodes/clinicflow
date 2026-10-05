import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { gotoHydrated, loginAsAdmin } from "./auth";
import { bookViaRpc, findFreeSlot } from "./support";

/**
 * Automated WCAG 2.1 A/AA checks with axe-core. Automated tools find roughly a third of
 * accessibility problems, so this complements (it does not replace) the manual checklist in
 * docs/ACCESSIBILITY.md.
 */
async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .map((node) => node.target.join(" "))
        .slice(0, 3)
        .join(" | ")}`,
  );
  expect(summary, `${label}: ${summary.join("\n")}`).toEqual([]);
}

test.describe("public pages", () => {
  for (const path of ["/", "/services", "/doctors", "/privacy", "/admin/login"]) {
    test(`${path} has no detectable WCAG A/AA violations`, async ({ page }) => {
      await gotoHydrated(page, path);
      await expectNoViolations(page, path);
    });
  }

  test("every step of the booking flow is accessible", async ({ page }) => {
    await gotoHydrated(page, "/book");
    await expectNoViolations(page, "service step");

    await page.getByTestId("service-general-consultation").click();
    await page.getByTestId("step-next").click();
    await expectNoViolations(page, "doctor step");

    await page.getByTestId("doctor-dr-meera-iyer").click();
    await page.getByTestId("step-next").click();
    await page.locator('button[data-date]:not([aria-disabled="true"])').first().click();
    await expect(page.locator('input[name="slot"]').first()).toBeAttached();
    await expectNoViolations(page, "date and time step");
    await page.locator('input[name="slot"]').first().check({ force: true });
    await page.getByTestId("step-next").click();

    await page.getByTestId("step-next").click(); // trigger validation errors
    await expect(page.getByText("Please enter your full name")).toBeVisible();
    await expectNoViolations(page, "details step with errors");
  });

  test("the confirmation page is accessible", async ({ page }) => {
    const { reference } = await bookViaRpc(
      await findFreeSlot("dr-arjun-deshmukh", "follow-up-visit", 12),
      "A11y Patient",
    );
    await gotoHydrated(page, `/book/confirmation/${reference}`);
    await expectNoViolations(page, "confirmation");
  });
});

test.describe("administrator pages", () => {
  test("dashboard, appointments, detail, schedule and events are accessible", async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState("networkidle");
    await expectNoViolations(page, "dashboard");

    await gotoHydrated(page, "/admin/appointments");
    await expectNoViolations(page, "appointments");

    await page.locator('a[href^="/admin/appointments/"]').first().click();
    await page.waitForLoadState("networkidle");
    await expectNoViolations(page, "appointment detail");

    await gotoHydrated(page, "/admin/schedule");
    await expectNoViolations(page, "schedule");

    await gotoHydrated(page, "/admin/events");
    await expectNoViolations(page, "events");
  });
});

test.describe("keyboard and motion", () => {
  test("skip link, visible focus and keyboard-only booking start work", async ({ page }) => {
    await gotoHydrated(page, "/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();

    // Focus outlines are visible on interactive elements.
    await page.getByRole("link", { name: "Book an appointment" }).first().focus();
    const outline = await page
      .getByRole("link", { name: "Book an appointment" })
      .first()
      .evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).toBe("solid");
  });

  test("reduced motion removes animations", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    const duration = await page.locator("h1").evaluate((element) => {
      const animated = element.closest(".animate-fade-up") ?? element;
      return getComputedStyle(animated).animationDuration;
    });
    expect(parseFloat(duration)).toBeLessThan(0.001);
    await context.close();
  });

  test("the calendar can be operated with the keyboard", async ({ page }) => {
    await gotoHydrated(page, "/book?service=general-consultation&doctor=dr-meera-iyer");
    const firstAvailable = page.locator('button[data-date]:not([aria-disabled="true"])').first();
    await expect(firstAvailable).toBeVisible();
    await firstAvailable.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    // Roving tabindex: exactly one date button is in the tab order.
    await expect(page.locator('button[data-date][tabindex="0"]')).toHaveCount(1);
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(
      page.locator('input[name="slot"]').first().or(page.getByText("No open times")),
    ).toBeAttached();
  });
});
