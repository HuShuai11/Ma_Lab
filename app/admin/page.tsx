import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin-auth";
import { loadAllContent } from "@/lib/site-content";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin/login");
  const items = await loadAllContent();

  return (
    <AdminDashboard
      initialItems={items}
      identity={{
        id: identity.id,
        username: identity.username,
        displayName: identity.displayName,
        role: identity.role,
        csrfToken: identity.csrfToken,
      }}
    />
  );
}
