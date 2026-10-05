"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Form fields share one pattern: a visible label, optional hint, and an error message that is
 * programmatically tied to the control (aria-describedby + aria-invalid) so screen readers
 * announce it. Required state is shown in text, never by colour alone.
 */

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-900">
        {label}
        {required ? (
          <span className="ml-1 font-normal text-ink-500">
            <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </span>
        ) : null}
        {optional ? <span className="ml-1.5 font-normal text-ink-500">(optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm leading-snug text-ink-500">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-sm font-medium text-danger-700"
        >
          <svg
            className="mt-0.5 size-4 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 4.5v4.2M8 10.9v.1"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const controlBase =
  "block w-full rounded-sm border bg-surface px-3.5 text-base text-ink-900 shadow-[0_1px_2px_rgb(16_48_46/0.04)_inset] " +
  "placeholder:text-ink-500 transition-[border-color,box-shadow] duration-150 " +
  "hover:border-ink-500 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-ink-500";

function controlClass(error: string | undefined, extra?: string) {
  return cn(controlBase, error ? "border-danger-600" : "border-ink-400", extra);
}

function describedBy(id: string, hint: ReactNode, error: string | undefined) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

interface BaseFieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  optional?: boolean;
  wrapperClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  optional,
  wrapperClassName,
  className,
  required,
  id: idProp,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"input">, "className"> & { className?: string }) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={wrapperClassName}
    >
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={controlClass(error, cn("min-h-11 py-2", className))}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  wrapperClassName,
  className,
  required,
  id: idProp,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"textarea">, "className"> & { className?: string }) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={wrapperClassName}
    >
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={controlClass(error, cn("min-h-24 py-2.5", className))}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  wrapperClassName,
  className,
  required,
  id: idProp,
  children,
  ...props
}: BaseFieldProps & Omit<ComponentProps<"select">, "className"> & { className?: string }) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={wrapperClassName}
    >
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={controlClass(error, cn("min-h-11 py-2 pr-9", className))}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  error,
  className,
  id: idProp,
  ...props
}: {
  label: ReactNode;
  error?: string | undefined;
  className?: string;
} & Omit<ComponentProps<"input">, "type" | "className">) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-xs border-ink-400 accent-brand-700"
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-[0.9375rem] leading-snug text-ink-900">
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="pl-8 text-sm font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
