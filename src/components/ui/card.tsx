import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-sand-200 bg-surface shadow-card", className)}
      {...props}
    />
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  className,
  as: Heading = "h2",
}: {
  id?: string;
  as?: "h1" | "h2";
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className="eyebrow eyebrow-rule mb-4">{eyebrow}</p> : null}
      <Heading id={id} className="text-[1.75rem] sm:text-[2.25rem]">
        {title}
      </Heading>
      {description ? (
        <p className="mt-4 max-w-prose text-[1.0625rem] text-ink-700">{description}</p>
      ) : null}
    </div>
  );
}
