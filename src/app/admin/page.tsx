import { PageHeader } from "@/components/domain/layout";
import { AdminGate } from "@/components/features/admin/admin-gate";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { AdminOverview } from "@/components/features/admin/admin-overview";

export const metadata = { title: "Admin · Overview" };

export default function AdminPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <PageHeader eyebrow="Admin" title="Overview" description="Data, users and marketplace health at a glance." />
      <AdminNav />
      <AdminGate>
        <AdminOverview />
      </AdminGate>
    </div>
  );
}
