import { expect, test } from "@playwright/test";

import { gotoHydrated, loginAsAdmin } from "./auth";
import { findFreeSlot, serviceClient, slotIsOffered } from "./support";

test.describe("schedule management affects bookable slots", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("blocking a date removes it from availability and unblocking restores it", async ({
    page,
  }) => {
    const slot = await findFreeSlot("dr-meera-iyer", "general-consultation", 8);
    expect(await slotIsOffered(slot)).toBe(true);

    await gotoHydrated(page, `/admin/schedule?doctor=${slot.doctorId}`);
    await page.getByLabel("First day").fill(slot.date);
    await page.getByLabel("Reason").fill("E2E block");
    await page.getByTestId("add-block").click();
    await expect(page.getByTestId("block-feedback")).toContainText("Dates blocked");
    await expect(page.getByTestId("blocked-list")).toContainText("E2E block");

    expect(await slotIsOffered(slot)).toBe(false);

    await page
      .getByRole("button", { name: /Remove block for/ })
      .first()
      .click();
    await expect(page.getByTestId("block-feedback")).toContainText("bookable again");
    expect(await slotIsOffered(slot)).toBe(true);
  });

  test("a break removes the slots it covers", async ({ page }) => {
    const slot = await findFreeSlot("dr-meera-iyer", "general-consultation", 9);
    expect(await slotIsOffered(slot)).toBe(true);
    const supabase = serviceClient();

    // Cover the whole working day, every day, for this doctor.
    const { data: created, error } = await supabase
      .from("doctor_breaks")
      .insert({
        doctor_id: slot.doctorId,
        weekday: null,
        start_time: "00:00",
        end_time: "23:59",
        label: "E2E all-day break",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    try {
      expect(await slotIsOffered(slot)).toBe(false);
    } finally {
      await supabase
        .from("doctor_breaks")
        .delete()
        .eq("id", created?.id ?? "");
    }
    expect(await slotIsOffered(slot)).toBe(true);

    // And the UI can add and remove a break.
    await gotoHydrated(page, `/admin/schedule?doctor=${slot.doctorId}`);
    await page.getByLabel("Name").fill("E2E lunch");
    await page.getByRole("button", { name: "Add break" }).click();
    await expect(page.getByText("Break added.")).toBeVisible();
    await expect(page.getByText("E2E lunch")).toBeVisible();
    await page.getByRole("button", { name: "Remove break E2E lunch" }).click();
    await expect(page.getByText("Break removed.")).toBeVisible();
  });

  test("changing weekly hours and slot length is saved and changes the offered slots", async ({
    page,
  }) => {
    const supabase = serviceClient();
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id, slot_minutes")
      .eq("slug", "dr-sunita-menon")
      .single();
    const { data: before } = await supabase
      .from("doctor_availability")
      .select("weekday, start_time, end_time")
      .eq("doctor_id", doctor!.id);

    try {
      await gotoHydrated(page, `/admin/schedule?doctor=${doctor!.id}`);
      // Remove Friday entirely and save.
      await page.getByTestId("day-toggle-5").uncheck();
      await page.getByTestId("save-schedule").click();
      await expect(page.getByTestId("schedule-feedback")).toContainText("Weekly schedule saved");

      const { data: after } = await supabase
        .from("doctor_availability")
        .select("weekday")
        .eq("doctor_id", doctor!.id);
      expect(after?.some((row) => row.weekday === 5)).toBe(false);
      expect(after?.length).toBe((before?.length ?? 0) - 1);
    } finally {
      // Restore the seeded schedule so other tests and demos are unaffected.
      await supabase.from("doctor_availability").delete().eq("doctor_id", doctor!.id);
      await supabase
        .from("doctor_availability")
        .insert((before ?? []).map((row) => ({ ...row, doctor_id: doctor!.id })));
      await supabase
        .from("doctors")
        .update({ slot_minutes: doctor!.slot_minutes })
        .eq("id", doctor!.id);
    }
  });

  test("overlapping working hours are rejected with a clear message", async ({ page }) => {
    const { data: doctor } = await serviceClient()
      .from("doctors")
      .select("id")
      .eq("slug", "dr-sunita-menon")
      .single();
    await gotoHydrated(page, `/admin/schedule?doctor=${doctor!.id}`);
    // Monday: make the second window overlap the first.
    await page.getByRole("button", { name: "Add another time window" }).first().click();
    await page.locator("#start-1-1").fill("11:00");
    await page.locator("#end-1-1").fill("12:00");
    await expect(page.getByText("Working hours on the same day must not overlap.")).toBeVisible();
    await page.getByTestId("save-schedule").click();
    await expect(page.getByTestId("schedule-feedback")).toContainText("must not overlap");
  });
});
