import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Every page below this layout is rendered only for an authenticated, active administrator. */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell userName={session.fullName} userEmail={session.email}>
      {children}
    </AdminShell>
  );
}
