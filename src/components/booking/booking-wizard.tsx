"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck } from "lucide-react";

import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import {
  loadAvailableDates,
  loadSlots,
  submitBooking,
} from "@/app/(public)/book/actions";
import { patientDetailsSchema, toFieldErrors, type FieldErrors } from "@/lib/validation/booking";

import { Stepper } from "./stepper";
import { StepDateTime, type LoadStatus } from "./step-datetime";
import { StepDetails, EMPTY_DETAILS, type DetailsForm } from "./step-details";
import { StepDoctor } from "./step-doctor";
import { StepReview } from "./step-review";
import { StepService } from "./step-service";
import { SummaryCard } from "./summary-card";
import {
  STEP_ORDER,
  type SlotDto,
  type WizardClinic,
  type WizardDoctor,
  type WizardService,
  type WizardStep,
} from "./types";

const HEADINGS: Record<WizardStep, { title: string; hint: string }> = {
  service: { title: "What would you like to book?", hint: "Choose the service that fits your visit." },
  doctor: { title: "Choose your doctor", hint: "These doctors offer the service you selected." },
  datetime: { title: "Pick a date and time", hint: "Highlighted dates have open times." },
  details: { title: "Your details", hint: "So the clinic can reach you about your visit." },
  review: { title: "Review and confirm", hint: "Check everything below, then confirm your booking." },
};

interface Props {
  clinic: WizardClinic;
  services: WizardService[];
  doctors: WizardDoctor[];
  initialServiceId: string | null;
  initialDoctorId: string | null;
}

export function BookingWizard({ clinic, services, doctors, initialServiceId, initialDoctorId }: Props) {
  const router = useRouter();

  // A deep link such as /book?service=x&doctor=y skips the steps that are already answered.
  const initial = useMemo(() => {
    const doctor = doctors.find((item) => item.id === initialDoctorId) ?? null;
    let serviceId = services.find((item) => item.id === initialServiceId)?.id ?? null;
    if (doctor && serviceId && !doctor.serviceIds.includes(serviceId)) serviceId = null;
    const step: WizardStep = serviceId ? (doctor ? "datetime" : "doctor") : "service";
    return { doctorId: doctor?.id ?? null, serviceId, step };
  }, [doctors, services, initialDoctorId, initialServiceId]);

  const [step, setStep] = useState<WizardStep>(initial.step);
  const [furthest, setFurthest] = useState(STEP_ORDER.indexOf(initial.step));
  const [serviceId, setServiceId] = useState<string | null>(initial.serviceId);
  const [doctorId, setDoctorId] = useState<string | null>(initial.doctorId);

  const [datesStatus, setDatesStatus] = useState<LoadStatus>(initial.step === "datetime" ? "loading" : "idle");
  const [availability, setAvailability] = useState<ReadonlyMap<string, number>>(new Map());
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<LoadStatus>("idle");
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [details, setDetails] = useState<DetailsForm>(EMPTY_DETAILS);
  const [touched, setTouched] = useState<ReadonlySet<keyof DetailsForm>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; code: string } | null>(null);

  const startedAt = useRef(0);
  const datesRequest = useRef(0);
  const slotsRequest = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const service = services.find((item) => item.id === serviceId);
  const doctor = doctors.find((item) => item.id === doctorId);
  const doctorsForService = useMemo(
    () => (serviceId ? doctors.filter((item) => item.serviceIds.includes(serviceId)) : doctors),
    [doctors, serviceId],
  );
  const servicesForDoctor = useMemo(
    () => (initialDoctorId ? services.filter((item) => doctors.find((d) => d.id === initialDoctorId)?.serviceIds.includes(item.id)) : services),
    [services, doctors, initialDoctorId],
  );

  // Move keyboard/screen reader focus to the new step's heading (not on first page load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      startedAt.current = Date.now();
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  async function fetchDates(nextDoctorId: string, nextServiceId: string) {
    const request = ++datesRequest.current;
    const result = await loadAvailableDates({ doctorId: nextDoctorId, serviceId: nextServiceId });
    if (request !== datesRequest.current) return; // a newer request superseded this one
    if (result.ok) {
      setAvailability(new Map(result.dates.map((item) => [item.date, item.count])));
      setDatesStatus("ready");
    } else {
      setDatesStatus("error");
    }
  }

  async function fetchSlots(nextDoctorId: string, nextServiceId: string, nextDate: string) {
    const request = ++slotsRequest.current;
    const result = await loadSlots({ doctorId: nextDoctorId, serviceId: nextServiceId, date: nextDate });
    if (request !== slotsRequest.current) return;
    if (result.ok) {
      setSlots(result.slots);
      setSlotsStatus("ready");
    } else {
      setSlotsStatus("error");
    }
  }

  // Initial load when arriving via a deep link that already fixed service and doctor.
  useEffect(() => {
    if (initial.step === "datetime" && initial.doctorId && initial.serviceId) {
      void fetchDates(initial.doctorId, initial.serviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  function resetAvailability() {
    datesRequest.current += 1;
    slotsRequest.current += 1;
    setAvailability(new Map());
    setDatesStatus("idle");
    setDate(null);
    setSlots([]);
    setSlotsStatus("idle");
    setSlotStart(null);
    setNotice(null);
  }

  function goTo(next: WizardStep) {
    setStep(next);
    setFurthest((value) => Math.max(value, STEP_ORDER.indexOf(next)));
    setSubmitError(null);
    if (next === "datetime" && serviceId && doctorId && (datesStatus === "idle" || datesStatus === "error")) {
      setDatesStatus("loading");
      void fetchDates(doctorId, serviceId);
    }
  }

  function chooseService(id: string) {
    if (id === serviceId) return;
    setServiceId(id);
    const stillValid = doctor?.serviceIds.includes(id) ?? false;
    if (!stillValid && !initialDoctorId) setDoctorId(null);
    resetAvailability();
    setFurthest(STEP_ORDER.indexOf("service"));
  }

  function chooseDoctor(id: string) {
    if (id === doctorId) return;
    setDoctorId(id);
    resetAvailability();
    setFurthest(STEP_ORDER.indexOf("doctor"));
  }

  function chooseDate(nextDate: string) {
    if (!doctorId || !serviceId) return;
    setDate(nextDate);
    setSlotStart(null);
    setSlots([]);
    setNotice(null);
    setSlotsStatus("loading");
    void fetchSlots(doctorId, serviceId, nextDate);
  }

  function chooseSlot(start: string) {
    setSlotStart(start);
    setNotice(null);
  }

  const parsed = useMemo(() => patientDetailsSchema.safeParse(details), [details]);
  const allErrors: FieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
  const visibleErrors: FieldErrors = {};
  for (const [field, message] of Object.entries(allErrors)) {
    if (showAllErrors || touched.has(field as keyof DetailsForm)) visibleErrors[field] = message;
  }

  function changeDetail<K extends keyof DetailsForm>(field: K, value: DetailsForm[K]) {
    setDetails((current) => ({ ...current, [field]: value }));
    if (field === "consent") setTouched((current) => new Set(current).add("consent"));
  }

  function blurDetail(field: keyof DetailsForm) {
    setTouched((current) => new Set(current).add(field));
  }

  function continueFromDetails() {
    if (!parsed.success) {
      setShowAllErrors(true);
      window.setTimeout(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }
    goTo("review");
  }

  async function confirm() {
    if (!doctorId || !serviceId || !slotStart || !parsed.success) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitBooking({
        doctorId,
        serviceId,
        startAt: slotStart,
        details,
        website: honeypot,
        elapsedMs: Math.max(0, Date.now() - startedAt.current),
      });

      if (result.ok) {
        router.push(`/book/confirmation/${encodeURIComponent(result.reference)}`);
        return;
      }

      if (result.code === "slot_unavailable") {
        // Keep the patient's details; send them back to choose another time on the same day.
        setNotice(result.message);
        setSlotStart(null);
        setSlots([]);
        setStep("datetime");
        setDatesStatus("loading");
        void fetchDates(doctorId, serviceId);
        if (date) {
          setSlotsStatus("loading");
          void fetchSlots(doctorId, serviceId, date);
        }
        return;
      }

      if (result.code === "validation" && result.fieldErrors) {
        setShowAllErrors(true);
        setStep("details");
      }
      setSubmitError({ message: result.message, code: result.code });
    } catch {
      setSubmitError({
        message: "We couldn't reach the server. Nothing has been booked. Please check your connection and try again.",
        code: "network",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canContinue: Record<WizardStep, boolean> = {
    service: Boolean(serviceId),
    doctor: Boolean(doctorId),
    datetime: Boolean(date && slotStart),
    details: true,
    review: true,
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const previous = stepIndex > 0 ? STEP_ORDER[stepIndex - 1] : undefined;
  const heading = HEADINGS[step];

  function onNext() {
    if (step === "details") continueFromDetails();
    else if (step === "review") void confirm();
    else if (step === "service" && doctor && serviceId && doctor.serviceIds.includes(serviceId)) {
      goTo("datetime"); // the doctor was already fixed by the link the patient followed
    } else {
      const next = STEP_ORDER[stepIndex + 1];
      if (next) goTo(next);
    }
  }

  return (
    <div>
      <Stepper current={step} furthest={furthest} onNavigate={goTo} />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-labelledby="step-heading"
          className="rounded-lg bg-paper p-0 sm:border sm:border-sand-200 sm:bg-surface sm:p-8 sm:shadow-card"
        >
          <h2
            id="step-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl outline-none sm:text-3xl"
            data-testid="step-heading"
          >
            {heading.title}
          </h2>
          <p className="mt-1.5 text-ink-500">{heading.hint}</p>

          <div className="mt-6" data-testid={`step-${step}`}>
            {step === "service" && (
              <StepService services={servicesForDoctor} selectedId={serviceId} onSelect={chooseService} />
            )}
            {step === "doctor" && (
              <StepDoctor doctors={doctorsForService} selectedId={doctorId} onSelect={chooseDoctor} />
            )}
            {step === "datetime" && (
              <StepDateTime
                clinic={clinic}
                availability={availability}
                datesStatus={datesStatus}
                onRetryDates={() => {
                  if (!doctorId || !serviceId) return;
                  setDatesStatus("loading");
                  void fetchDates(doctorId, serviceId);
                }}
                selectedDate={date}
                onSelectDate={chooseDate}
                slots={slots}
                slotsStatus={slotsStatus}
                onRetrySlots={() => {
                  if (!doctorId || !serviceId || !date) return;
                  setSlotsStatus("loading");
                  void fetchSlots(doctorId, serviceId, date);
                }}
                selectedSlot={slotStart}
                onSelectSlot={chooseSlot}
                notice={notice}
              />
            )}
            {step === "details" && (
              <StepDetails
                clinicName={clinic.name}
                values={details}
                errors={visibleErrors}
                onChange={changeDetail}
                onBlurField={blurDetail}
                honeypot={honeypot}
                onHoneypot={setHoneypot}
              />
            )}
            {step === "review" && service && doctor && date && slotStart && parsed.success && (
              <StepReview
                clinic={clinic}
                service={service}
                doctor={doctor}
                date={date}
                slot={slots.find((item) => item.start === slotStart) ?? { start: slotStart, end: slotStart }}
                details={details}
                normalizedMobile={parsed.data.mobile}
                onEdit={goTo}
              />
            )}
          </div>

          {submitError ? (
            <Alert tone="danger" title="Your booking was not completed" className="mt-6" live="assertive" data-testid="submit-error">
              {submitError.message}
            </Alert>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:border-t max-sm:border-sand-200 max-sm:bg-paper/95 max-sm:px-4 max-sm:py-3 max-sm:backdrop-blur-sm">
            {previous ? (
              <Button
                variant="secondary"
                onClick={() => goTo(previous)}
                disabled={submitting}
                icon={<ArrowLeft className="size-4" aria-hidden="true" />}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button
              size="lg"
              onClick={onNext}
              disabled={!canContinue[step]}
              loading={submitting}
              data-testid="step-next"
              icon={step === "review" && !submitting ? <CalendarCheck className="size-5" aria-hidden="true" /> : undefined}
            >
              {step === "review" ? (submitting ? "Booking…" : "Confirm booking") : "Continue"}
              {step !== "review" ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Button>
          </div>
        </section>

        <div className="lg:sticky lg:top-24">
          <SummaryCard clinic={clinic} service={service} doctor={doctor} date={date} slotStart={slotStart} />
        </div>
      </div>
    </div>
  );
}
