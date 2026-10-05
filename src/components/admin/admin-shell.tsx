"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Webhook,
  X,
} from "lucide-react";

import { signOutAction } from "@/app/admin/(protected)/actions";
import { Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays, exact: false },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarClock, exact: false },
  { href: "/admin/events", label: "Automation", icon: Webhook, exact: false },
] as const;

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-[0.9375rem] font-semibold transition-colors",
              active ? "bg-teal-700 text-white" : "text-teal-100 hover:bg-teal-800 hover:text-white",
            )}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountBlock({ name, email }: { name: string; email: string }) {
  return (
    <div className="space-y-3 border-t border-teal-800 pt-4">
      <div className="px-1">
        <p className="truncate text-sm font-semibold text-paper">{name}</p>
        <p className="truncate text-xs text-teal-100/75">{email}</p>
      </div>
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-teal-100 hover:bg-teal-800 hover:text-white"
      >
        <ExternalLink className="size-4" aria-hidden="true" /> View public site
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-800 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </form>
    </div>
  );
}

export function AdminShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_1fr]">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-sm bg-teal-700 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      {/* Desktop rail */}
      <aside className="hidden bg-teal-900 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col justify-between p-5">
          <div className="space-y-8">
            <Link href="/admin" className="block rounded-sm px-1 pt-1" aria-label="ClinicFlow dashboard">
              <Wordmark tone="light" />
            </Link>
            <NavList pathname={pathname} />
          </div>
          <AccountBlock name={userName} email={userEmail} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-sand-200 bg-paper px-4 lg:hidden">
        <Link href="/admin" aria-label="ClinicFlow dashboard">
          <Wordmark />
        </Link>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-sm hover:bg-sand-100"
          aria-label="Open navigation menu"
          onClick={() => setOpenFor(pathname)}
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </header>

      <dialog
        ref={drawerRef}
        aria-label="Navigation menu"
        onClose={() => setOpenFor(null)}
        onClick={(event) => {
          if (event.target === drawerRef.current) setOpenFor(null);
        }}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] bg-teal-900 p-0 text-teal-50 backdrop:bg-ink-900/50 open:animate-fade-in lg:hidden"
      >
        <div className="flex h-full flex-col justify-between p-5">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <Wordmark tone="light" />
              <button
                type="button"
                aria-label="Close navigation menu"
                className="flex size-10 items-center justify-center rounded-full text-teal-100 hover:bg-teal-800"
                onClick={() => setOpenFor(null)}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <NavList pathname={pathname} onNavigate={() => setOpenFor(null)} />
          </div>
          <AccountBlock name={userName} email={userEmail} />
        </div>
      </dialog>

      <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-6 outline-none sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
