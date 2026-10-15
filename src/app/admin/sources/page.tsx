import { PageHeader } from "@/components/domain/layout";
import { AdminGate } from "@/components/features/admin/admin-gate";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { AdminSources } from "@/components/features/admin/admin-sources";

export const metadata = { title: "Admin · Sources" };

export default function AdminSourcesPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Data sources"
        description="Register sources, check configuration, and run ingestion on demand."
      />
      <AdminNav />
      <AdminGate>
        <AdminSources />
      </AdminGate>
    </div>
  );
}
