import { listPublicResources } from "@/lib/resource-store";
import { ResourceListClient } from "@/components/resource-list-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const resources = await listPublicResources();
  return <ResourceListClient initialResources={resources} />;
}
