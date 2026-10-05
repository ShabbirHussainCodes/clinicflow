import { cn } from "@/lib/cn";

/**
 * ClinicFlow mark: a rounded tile holding an open "C" ring whose end flows into a small cross,
 * the cross being the "flow" of a patient through the clinic. Pure SVG, no external assets.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9", className)}
      role="img"
      aria-label="ClinicFlow"
      focusable="false"
    >
      <rect width="40" height="40" rx="11" fill="#0b5753" />
      <path
        d="M27.2 13.1A9.6 9.6 0 1 0 27.2 26.9"
        fill="none"
        stroke="#fbf9f5"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M27.4 20h6" stroke="#a6cda0" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M30.4 17v6" stroke="#a6cda0" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span
        className={cn(
          "font-display text-[1.375rem] font-semibold leading-none tracking-tight",
          tone === "dark" ? "text-ink-900" : "text-paper",
        )}
      >
        Clinic<span className={tone === "dark" ? "text-teal-600" : "text-sage-300"}>Flow</span>
      </span>
    </span>
  );
}
