import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow eyebrow-rule">Error 404</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">We couldn&rsquo;t find that page</h1>
      <p className="mt-4 max-w-md text-lg text-ink-700">
        The link may be old or mistyped. You can head back home or book an appointment from here.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonClasses({ size: "lg" })}>
          Go to the home page
        </Link>
        <Link href="/book" className={buttonClasses({ variant: "secondary", size: "lg" })}>
          Book an appointment
        </Link>
      </div>
    </main>
  );
}
