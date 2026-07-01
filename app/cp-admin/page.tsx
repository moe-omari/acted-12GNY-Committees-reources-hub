import { listAdminResources } from "@/lib/resource-store";
import { AdminPanelClient } from "@/components/admin-panel-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const resources = await listAdminResources();
  return <AdminPanelClient initialResources={resources} />;
}
