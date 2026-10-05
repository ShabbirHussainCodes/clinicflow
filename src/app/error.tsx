"use client";

import Link from "next/link";

import { Wordmark } from "@/components/brand/logo";
import { Button, buttonClasses } from "@/components/ui/button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Wordmark />
      <p className="eyebrow mt-12">Something went wrong</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">We&rsquo;re having trouble right now</h1>
      <p className="mt-4 max-w-md text-lg text-ink-700">
        This page could not be loaded. Please try again in a moment. If it keeps happening, call the
        clinic and we will book you in by phone.
      </p>
      {error.digest ? (
        <p className="mt-3 text-sm text-ink-500">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={buttonClasses({ variant: "secondary", size: "lg" })}>
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
