import { expect, test } from "@playwright/test";

import { gotoHydrated, loginAsAdmin } from "./auth";
import { bookViaRpc, findFreeSlot, serviceClient, slotIsOffered } from "./support";

test.describe("appointment management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("search by name and reference, filter by status", async ({ page }) => {
    const slot = await findFreeSlot("dr-meera-iyer", "general-consultation", 3);
    const unique = `Zephyrine${Date.now().toString(36)}`;
    const { reference } = await bookViaRpc(slot, `Searchable ${unique}`);

    await gotoHydrated(page, "/admin/appointments");
    await page.getByLabel("Search").fill(unique.toLowerCase());
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByTestId("result-count")).toContainText("1 appointment");
    await expect(
      page.getByRole("link", { name: new RegExp(`Searchable ${unique}`) }).first(),
    ).toBeVisible();

    await page.getByLabel("Search").fill(reference);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByTestId("result-count")).toContainText("1 appointment");

    await page.getByLabel("Status").selectOption("cancelled");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByText("No appointments match these filters")).toBeVisible();
  });

  test("confirm an appointment, then cancel it with a confirmation step that releases the slot", async ({
    page,
  }) => {
    const slot = await findFreeSlot("dr-meera-iyer", "general-consultation", 4);
    const { id, reference } = await bookViaRpc(slot, "Lifecycle Patient");
    expect(await slotIsOffered(slot)).toBe(false);

    await gotoHydrated(page, `/admin/appointments/${id}`);
    await expect(page.getByTestId("detail-reference")).toHaveText(reference);
    await expect(page.getByText("Pending").first()).toBeVisible();

    // Completed / no-show are not available before the appointment time.
    await expect(page.getByTestId("action-complete")).toBeDisabled();
    await expect(page.getByTestId("action-no-show")).toBeDisabled();

    await page.getByTestId("action-confirm").click();
    await expect(page.getByTestId("action-feedback")).toContainText("Appointment confirmed");
    await expect(page.getByText("Confirmed").first()).toBeVisible();

    // Cancelling asks for confirmation first; "Keep appointment" changes nothing.
    await page.getByTestId("action-cancel").click();
    const dialog = page.getByTestId("cancel-dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep appointment" }).click();
    await expect(dialog).toBeHidden();
    expect(await slotIsOffered(slot)).toBe(false);

    await page.getByTestId("action-cancel").click();
    await dialog.getByLabel(/Reason/).fill("Patient called to cancel");
    await page.getByTestId("confirm-cancel").click();
    await expect(page.getByTestId("action-feedback")).toContainText("Appointment cancelled");
    await expect(page.getByText("This appointment is cancelled")).toBeVisible();

    // The slot is bookable again, and the history records every step.
    expect(await slotIsOffered(slot)).toBe(true);
    await expect(page.getByText("Status changed to Confirmed")).toBeVisible();
    await expect(page.getByText("Status changed to Cancelled")).toBeVisible();
    await expect(page.getByText("Patient called to cancel").first()).toBeVisible();

    // Outbox events were recorded for the lifecycle.
    const { data: events } = await serviceClient()
      .from("automation_events")
      .select("event_type")
      .eq("appointment_id", id)
      .order("created_at");
    expect(events?.map((event) => event.event_type)).toEqual([
      "appointment.created",
      "appointment.confirmed",
      "appointment.cancelled",
    ]);
  });

  test("reschedule moves the appointment to a free slot and frees the old one", async ({
    page,
  }) => {
    const original = await findFreeSlot("dr-meera-iyer", "general-consultation", 5);
    const target = await findFreeSlot("dr-meera-iyer", "general-consultation", 6);
    const { id } = await bookViaRpc(original, "Reschedule Patient");

    await gotoHydrated(page, `/admin/appointments/${id}`);
    await page.getByTestId("action-reschedule").click();
    const dialog = page.getByTestId("reschedule-dialog");
    await dialog.getByLabel("New date").fill(target.date);
    const firstSlot = dialog.locator('input[name="reschedule-slot"]').first();
    await expect(firstSlot).toBeAttached();
    await firstSlot.check({ force: true });
    await page.getByTestId("confirm-reschedule").click();
    await expect(page.getByTestId("action-feedback")).toContainText("Appointment rescheduled");

    expect(await slotIsOffered(original)).toBe(true);
    await expect(page.getByText(/Rescheduled from/)).toBeVisible();
  });

  test("notes are saved and shown", async ({ page }) => {
    const slot = await findFreeSlot("dr-arjun-deshmukh", "follow-up-visit", 7);
    const { id } = await bookViaRpc(slot, "Notes Patient");
    await gotoHydrated(page, `/admin/appointments/${id}`);
    await page.getByLabel("Internal notes").fill("Prefers a morning call.");
    await page.getByRole("button", { name: "Save notes" }).click();
    await expect(page.getByText("Notes saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Internal notes")).toHaveValue("Prefers a morning call.");
  });

  test("unknown appointment ids show a not-found page", async ({ page }) => {
    const response = await page.goto("/admin/appointments/00000000-0000-0000-0000-000000000000");
    expect(response?.status()).toBe(404);
  });
});
