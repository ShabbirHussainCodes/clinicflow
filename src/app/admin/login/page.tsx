import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/admin/login-form";
import { Wordmark } from "@/components/brand/logo";
import { DoctorFigure } from "@/components/illustrations/doctor-avatar";
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
        className="relative hidden overflow-hidden bg-teal-900 lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <Wordmark tone="light" />
        <div className="relative mx-auto w-full max-w-sm">
          <svg viewBox="0 0 400 420" className="block h-auto w-full" focusable="false">
            <path d="M20 420V190a180 180 0 0 1 360 0v230Z" fill="#0b5753" />
            <path d="M44 420V194a156 156 0 0 1 312 0v226Z" fill="#0f6b66" opacity="0.75" />
            <g transform="translate(86 150) scale(1.14)">
              <DoctorFigure theme="teal" />
            </g>
            <rect x="0" y="408" width="400" height="12" rx="6" fill="#094643" />
          </svg>
        </div>
        <p className="max-w-sm font-display text-2xl leading-snug text-teal-50">
          Everything the front desk needs for today, in one calm place.
        </p>
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
