import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { Wordmark } from "@/components/brand/logo";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getAdminSession()) redirect("/admin");

  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const next =
    nextParam && nextParam.startsWith("/admin") && !nextParam.startsWith("//")
      ? nextParam
      : "/admin";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside
        aria-hidden="true"
        className="hidden bg-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <Wordmark tone="light" />
        <div>
          <p className="max-w-md font-display text-[2rem] font-medium leading-tight text-paper">
            Today&rsquo;s appointments, doctors&rsquo; schedules and holidays in one place.
          </p>
          <p className="mt-5 max-w-md text-brand-100/85">
            For clinic staff only. Ask the clinic administrator if you need an account.
          </p>
        </div>
        <p className="text-sm text-brand-100/70">Staff area</p>
      </aside>

      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-1.5 rounded-xs text-sm font-semibold text-ink-700 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to the clinic website
          </Link>
          <div className="lg:hidden">
            <Wordmark className="mb-8" />
          </div>
          <p className="eyebrow mb-3 flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden="true" /> Staff only
          </p>
          <h1 className="text-4xl">Sign in to the dashboard</h1>
          <p className="mt-3 text-ink-700">
            Use the account created for you by the clinic administrator. Accounts cannot be created
            from this page.
          </p>

          <div className="mt-8">
            <LoginForm next={next} />
          </div>
        </div>
      </main>
    </div>
  );
}
