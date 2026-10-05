import { expect, test } from "@playwright/test";

import { gotoHydrated } from "./auth";
import { serviceClient } from "./support";

/**
 * The public website as a visitor sees it. These checks rely on structure and on the clinic data in
 * the database, not on the wording in src/config/site.ts, so a clinic can rewrite its copy freely.
 */
test.describe("public website", () => {
  test("carries the clinic's own identity rather than the software's", async ({ page }) => {
    const { data } = await serviceClient().from("clinics").select("name").limit(1).single();
    const clinicName = data?.name ?? "";
    expect(clinicName).not.toBe("");

    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: new RegExp(clinicName) })).toBeVisible();
    await expect(header).not.toContainText("ClinicFlow");
    await expect(page).toHaveTitle(new RegExp(clinicName));
  });

  test("shows whether the clinic is open and an opening-hours table with today marked", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText(/^(Open|Closed) now$/).first()).toBeVisible();

    const rows = page.locator("#contact table tbody tr");
    await expect(rows).toHaveCount(7);
    await expect(page.locator("#contact table tbody tr", { hasText: "Today" })).toHaveCount(1);
  });

  test("lists each doctor's next free times as real booking links", async ({ page }) => {
    await page.goto("/");
    const panel = page.getByRole("region", { name: "Next available times" });
    await expect(panel).toBeVisible();

    const hrefs = await panel
      .getByRole("link", { name: /^Book .* with Dr\./ })
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(1);

    const doctors = new Set<string>();
    for (const href of hrefs) {
      const params = new URL(href, "http://localhost").searchParams;
      for (const key of ["service", "doctor", "date", "time"]) {
        expect(params.get(key), `${key} in ${href}`).toBeTruthy();
      }
      doctors.add(params.get("doctor") ?? "");
    }
    expect(doctors.size).toBeGreaterThan(1);
  });

  test("frequently asked questions open and close", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("#faq details").first();
    await expect(first).not.toHaveJSProperty("open", true);
    await first.locator("summary").click();
    await expect(first).toHaveJSProperty("open", true);
    await expect(first.locator("p")).toBeVisible();
    await first.locator("summary").click();
    await expect(first).toHaveJSProperty("open", false);
  });

  test("the navigation marks the current page and anchors reach their sections", async ({
    page,
  }) => {
    await gotoHydrated(page, "/services");
    await expect(
      page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Services" }),
    ).toHaveAttribute("aria-current", "page");

    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Contact" })
      .click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator("#contact")).toBeInViewport();
  });

  test("pages do not scroll sideways at phone, tablet and desktop widths", async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/services", "/doctors", "/privacy", "/book"]) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(
          overflow,
          `${path} at ${width}px should not scroll horizontally`,
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});
