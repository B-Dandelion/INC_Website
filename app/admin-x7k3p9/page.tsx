import { redirect } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import { hasAdminSession } from "@/lib/requireAdmin";

// Signed-in admins skip the password form and go straight to the dashboard.
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  if (await hasAdminSession()) redirect("/admin-x7k3p9/resources");
  const { reason } = await searchParams;
  return <AdminGate sessionExpired={reason === "session"} />;
}
