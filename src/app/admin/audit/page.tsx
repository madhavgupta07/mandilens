import { PageHeader } from "@/components/domain/layout";
import { AdminGate } from "@/components/features/admin/admin-gate";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { AdminAudit } from "@/components/features/admin/admin-audit";

export const metadata = { title: "Admin · Audit log" };

export default function AdminAuditPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        description="Sensitive actions are recorded with the actor, entity and time."
      />
      <AdminNav />
      <AdminGate>
        <AdminAudit />
      </AdminGate>
    </div>
  );
}
