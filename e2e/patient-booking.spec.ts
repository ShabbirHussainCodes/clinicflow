import { expect, test, type Page } from "@playwright/test";

import { bookViaRpc, findFreeSlot, serviceClient, uniquePhone } from "./support";

async function chooseFirstAvailableSlot(page: Page) {
  const firstDate = page.locator('button[data-date]:not([aria-disabled="true"])').first();
  await expect(firstDate).toBeVisible();
  await firstDate.click();
  const firstSlot = page.locator('input[name="slot"]').first();
  await expect(firstSlot).toBeAttached();
  await firstSlot.check({ force: true });
}

test.describe("patient booking flow", () => {
  test("a patient can complete a booking and the appointment is persisted", async ({ page }) => {
    await page.goto("/book");
    await expect(
      page.getByRole("heading", { level: 1, name: "Book an appointment" }),
    ).toBeVisible();

    // 1. service
    await page.getByTestId("service-general-consultation").click();
    await page.getByTestId("step-next").click();

    // 2. doctor
    await expect(page.getByTestId("step-heading")).toHaveText("Choose your doctor");
    await page.getByTestId("doctor-dr-meera-iyer").click();
    await page.getByTestId("step-next").click();

    // 3. date and time
    await expect(page.getByTestId("step-heading")).toHaveText("Pick a date and time");
    await chooseFirstAvailableSlot(page);
    await page.getByTestId("step-next").click();

    // 4. details (validation first)
    await expect(page.getByTestId("step-heading")).toHaveText("Your details");
    await page.getByTestId("step-next").click();
    await expect(page.getByText("Please enter your full name")).toBeVisible();
    await expect(page.getByText("Please enter your mobile number.")).toBeVisible();
    await expect(page.getByText("Please confirm that the clinic may contact you")).toBeVisible();

    const phone = uniquePhone();
    await page.getByLabel("Full name").fill("Test Patient");
    await page.getByLabel("Mobile number").fill(`${phone.slice(0, 5)} ${phone.slice(5)}`);
    await page.getByLabel("Reason for visit").fill("Routine check-up");
    await page.getByLabel(/I agree that/).check();
    await page.getByTestId("step-next").click();

    // 5. review
    await expect(page.getByTestId("step-heading")).toHaveText("Review and confirm");
    await expect(page.getByTestId("step-review")).toContainText("Test Patient");
    await expect(page.getByTestId("step-review")).toContainText("Dr. Meera Iyer");
    // The bot-timing heuristic needs a human-plausible interval since the page opened.
    await page.waitForTimeout(3200);
    await page.getByTestId("step-next").click();

    // 6. confirmation
    await expect(page).toHaveURL(/\/book\/confirmation\/CF-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    await expect(page.getByTestId("confirmation-heading")).toHaveText("Your appointment is booked");
    const reference = (await page.getByTestId("booking-reference").textContent())?.trim() ?? "";
    expect(reference).toMatch(/^CF-[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    // Persisted in the database as a pending appointment for the right doctor/service/patient.
    const { data, error } = await serviceClient()
      .from("appointments")
      .select("status, patient_name, patient_phone, consent_given, source")
      .eq("reference", reference)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      status: "pending",
      patient_name: "Test Patient",
      patient_phone: `+91${phone}`,
      consent_given: true,
      source: "web",
    });

    // The outbox received an appointment.created event without any external service running.
    const { data: events } = await serviceClient()
      .from("automation_events")
      .select("event_type, status")
      .eq("payload->data->appointment->>reference", reference);
    expect(events).toEqual([{ event_type: "appointment.created", status: "pending" }]);
  });

  test("the home page's next-available times are real links that start a booking with that time selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const firstTime = page.getByRole("link", { name: /^Book .* with Dr\./ }).first();
    await expect(firstTime).toBeVisible();
    const href = (await firstTime.getAttribute("href")) ?? "";
    const wanted = new URL(href, "http://localhost").searchParams.get("time") ?? "";
    expect(wanted).not.toBe("");

    await firstTime.click();
    await expect(page).toHaveURL(/\/book\?/);
    await expect(page.getByTestId("step-heading")).toHaveText("Pick a date and time");

    // The chosen time is already selected and the patient can continue straight away.
    const selected = page.locator('input[name="slot"]:checked');
    await expect(selected).toHaveCount(1);
    expect(new Date(await selected.inputValue()).getTime()).toBe(new Date(wanted).getTime());
    await expect(page.getByTestId("step-next")).toBeEnabled();
    await expect(page.getByTestId("booking-summary")).toContainText("General Consultation");
    await page.getByTestId("step-next").click();
    await expect(page.getByTestId("step-heading")).toHaveText("Your details");
  });

  test("a time from a shared link that has since been taken is explained, not silently dropped", async ({
    page,
  }) => {
    const slot = await findFreeSlot("dr-meera-iyer", "general-consultation", 16);
    await bookViaRpc(slot, "Taken Before Link");
    const params = new URLSearchParams({
      service: "general-consultation",
      doctor: "dr-meera-iyer",
      date: slot.date,
      time: slot.start,
    });
    await page.goto(`/book?${params.toString()}`);
    await expect(page.getByTestId("slot-taken-alert")).toContainText("no longer available");
    await expect(page.locator('input[name="slot"]:checked')).toHaveCount(0);
    await expect(page.getByTestId("step-next")).toBeDisabled();
  });

  test("deep links skip answered steps", async ({ page }) => {
    await page.goto("/book?service=general-consultation&doctor=dr-meera-iyer");
    await expect(page.getByTestId("step-heading")).toHaveText("Pick a date and time");
    await expect(page.getByTestId("booking-summary")).toContainText("Dr. Meera Iyer");
    await expect(page.getByTestId("booking-summary")).toContainText("General Consultation");
  });

  test("confirmation pages are not found for unknown or malformed references", async ({ page }) => {
    const unknown = await page.goto("/book/confirmation/CF-AAAAA-BBBBB");
    expect(unknown?.status()).toBe(404);
    const malformed = await page.goto("/book/confirmation/12345");
    expect(malformed?.status()).toBe(404);
  });

  test("a time taken by someone else is reported clearly and keeps the patient's details", async ({
    page,
  }) => {
    await page.goto("/book?service=general-consultation&doctor=dr-meera-iyer");
    await chooseFirstAvailableSlot(page);
    const chosen = await page.locator('input[name="slot"]:checked').inputValue();
    await page.getByTestId("step-next").click();

    await page.getByLabel("Full name").fill("Second Patient");
    await page.getByLabel("Mobile number").fill(uniquePhone());
    await page.getByLabel(/I agree that/).check();
    await page.getByTestId("step-next").click();
    await expect(page.getByTestId("step-heading")).toHaveText("Review and confirm");

    // Someone else books exactly that slot while this patient is reviewing.
    const supabase = serviceClient();
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("slug", "dr-meera-iyer")
      .single();
    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("slug", "general-consultation")
      .single();
    const rival = await supabase.rpc("book_appointment", {
      p_doctor_id: doctor!.id,
      p_service_id: service!.id,
      p_start_at: chosen,
      p_patient_name: "Rival Patient",
      p_patient_phone: `+91${uniquePhone()}`,
      p_consent: true,
    });
    expect(rival.data).toMatchObject({ ok: true });

    await page.waitForTimeout(3200);
    await page.getByTestId("step-next").click();

    await expect(page.getByTestId("slot-taken-alert")).toContainText("was just taken");
    await expect(page.getByTestId("step-heading")).toHaveText("Pick a date and time");
    // The taken slot is no longer offered.
    await expect(page.locator(`input[name="slot"][value="${chosen}"]`)).toHaveCount(0);
  });
});
