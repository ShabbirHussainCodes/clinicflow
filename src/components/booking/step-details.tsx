"use client";

import { Lock } from "lucide-react";

import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  VISIT_REASON_MAX,
  type FieldErrors,
} from "@/lib/validation/booking";

export interface DetailsForm {
  fullName: string;
  mobile: string;
  email: string;
  ageRange: string;
  visitReason: string;
  consent: boolean;
}

export const EMPTY_DETAILS: DetailsForm = {
  fullName: "",
  mobile: "",
  email: "",
  ageRange: "",
  visitReason: "",
  consent: false,
};

export function StepDetails({
  clinicName,
  values,
  errors,
  onChange,
  onBlurField,
  honeypot,
  onHoneypot,
}: {
  clinicName: string;
  values: DetailsForm;
  errors: FieldErrors;
  onChange: <K extends keyof DetailsForm>(field: K, value: DetailsForm[K]) => void;
  onBlurField: (field: keyof DetailsForm) => void;
  honeypot: string;
  onHoneypot: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2.5 rounded-md bg-brand-50 p-3.5 text-sm text-brand-900">
        <Lock className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
        We only ask for what the clinic needs to reach you. No account or password is required.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          required
          value={values.fullName}
          error={errors.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          onBlur={() => onBlurField("fullName")}
          wrapperClassName="sm:col-span-2"
          maxLength={100}
        />
        <TextField
          label="Mobile number"
          name="mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="98765 43210"
          hint="The clinic will use this to confirm or reschedule."
          value={values.mobile}
          error={errors.mobile}
          onChange={(event) => onChange("mobile", event.target.value)}
          onBlur={() => onBlurField("mobile")}
          maxLength={20}
        />
        <TextField
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          optional
          hint="For a copy of your booking details."
          value={values.email}
          error={errors.email}
          onChange={(event) => onChange("email", event.target.value)}
          onBlur={() => onBlurField("email")}
          maxLength={254}
        />
        <SelectField
          label="Age range of the patient"
          name="ageRange"
          optional
          value={values.ageRange}
          error={errors.ageRange}
          onChange={(event) => onChange("ageRange", event.target.value)}
          onBlur={() => onBlurField("ageRange")}
        >
          <option value="">Prefer not to say</option>
          {AGE_RANGES.map((range) => (
            <option key={range} value={range}>
              {AGE_RANGE_LABELS[range]}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Reason for visit"
          name="visitReason"
          optional
          wrapperClassName="sm:col-span-2"
          hint="A few words are enough, for example “routine check-up”. Please do not enter sensitive medical details here."
          value={values.visitReason}
          error={errors.visitReason}
          onChange={(event) => onChange("visitReason", event.target.value)}
          onBlur={() => onBlurField("visitReason")}
          maxLength={VISIT_REASON_MAX + 50}
          rows={3}
        />
      </div>

      {/* Honeypot: hidden from people and assistive technology; bots tend to fill every input. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => onHoneypot(event.target.value)}
          />
        </label>
      </div>

      <CheckboxField
        name="consent"
        checked={values.consent}
        error={errors.consent}
        onChange={(event) => {
          onChange("consent", event.target.checked);
        }}
        label={
          <>
            I agree that {clinicName} may contact me about this appointment by phone, SMS, WhatsApp
            or email.{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="font-semibold text-brand-700 underline underline-offset-2"
            >
              Privacy notice
            </a>
          </>
        }
      />
    </div>
  );
}
