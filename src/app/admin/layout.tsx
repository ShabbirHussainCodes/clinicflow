import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Staff dashboard", template: "%s | ClinicFlow staff" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
