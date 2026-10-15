import { PageHeader } from "@/components/domain/layout";
import { AdminGate } from "@/components/features/admin/admin-gate";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { AdminImports } from "@/components/features/admin/admin-imports";

export const metadata = { title: "Admin · Imports" };

export default function AdminImportsPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Import data"
        description="Upload CSV or JSON, review the validated preview, then commit. Nothing is stored until you confirm."
      />
      <AdminNav />
      <AdminGate>
        <AdminImports />
      </AdminGate>
    </div>
  );
}
