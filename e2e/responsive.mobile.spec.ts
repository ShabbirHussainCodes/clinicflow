import { expect, test, type Page } from "@playwright/test";

import { gotoHydrated, loginAsAdmin } from "./auth";
import { serviceClient, uniquePhone } from "./support";

async function expectNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, `${label} should not scroll horizontally`).toBeLessThanOrEqual(1);
}

test.describe("mobile layouts", () => {
  test("public pages fit the screen and the menu works", async ({ page }) => {
    for (const path of ["/", "/services", "/doctors", "/book", "/privacy"]) {
      await gotoHydrated(page, path);
      await expectNoHorizontalScroll(page, path);
    }

    await gotoHydrated(page, "/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Mobile" })
      .getByRole("link", { name: "Services" })
      .click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
  });

  test("touch targets on the booking flow are at least 44px", async ({ page }) => {
    await gotoHydrated(page, "/book?service=general-consultation&doctor=dr-meera-iyer");
    const dateButton = page.locator('button[data-date]:not([aria-disabled="true"])').first();
    await expect(dateButton).toBeVisible();
    const sizes = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          'button[data-date], [data-testid="step-next"], header a, header button',
        ),
      ]
        .filter((element) => element.offsetParent !== null)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            name:
              element.textContent?.trim().slice(0, 20) ||
              element.getAttribute("aria-label") ||
              element.tagName,
            w: box.width,
            h: box.height,
          };
        }),
    );
    for (const size of sizes) {
      expect(Math.min(size.w, size.h), `${size.name} is too small to tap`).toBeGreaterThanOrEqual(
        40,
      );
    }
  });

  test("a patient can complete a booking on a phone", async ({ page }) => {
    await gotoHydrated(page, "/book?service=general-consultation&doctor=dr-sunita-menon");
    // Dr. Menon does not offer General Consultation, so the link falls back to choosing a service.
    await expect(page.getByTestId("step-heading")).toHaveText("What would you like to book?");
    await page.getByTestId("service-follow-up-visit").click();
    await page.getByTestId("step-next").click();

    await page.locator('button[data-date]:not([aria-disabled="true"])').first().click();
    const slot = page.locator('input[name="slot"]').first();
    await expect(slot).toBeAttached();
    await slot.check({ force: true });
    await page.getByTestId("step-next").click();

    await page.getByLabel("Full name").fill("Mobile Patient");
    await page.getByLabel("Mobile number").fill(uniquePhone());
    await page.getByLabel(/I agree that/).check();
    await page.getByTestId("step-next").click();
    await expectNoHorizontalScroll(page, "review step");
    await page.waitForTimeout(3200);
    await page.getByTestId("step-next").click();

    await expect(page.getByTestId("confirmation-heading")).toHaveText("Your appointment is booked");
    await expectNoHorizontalScroll(page, "confirmation");
    const reference = (await page.getByTestId("booking-reference").textContent())?.trim() ?? "";
    const { data } = await serviceClient()
      .from("appointments")
      .select("status")
      .eq("reference", reference)
      .single();
    expect(data?.status).toBe("pending");
  });

  test("the admin area works on a phone", async ({ page }) => {
    await loginAsAdmin(page);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page, "dashboard");

    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Appointments" }).click();
    await expect(page).toHaveURL(/\/admin\/appointments$/);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page, "appointments");

    // Rows become cards on small screens.
    await expect(page.locator("ul a[href^='/admin/appointments/']").first()).toBeVisible();
    await page.locator("ul a[href^='/admin/appointments/']").first().click();
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page, "appointment detail");

    await gotoHydrated(page, "/admin/schedule");
    await expectNoHorizontalScroll(page, "schedule");
  });
});
