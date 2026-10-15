import { PageHeader } from "@/components/domain/layout";
import { AdminGate } from "@/components/features/admin/admin-gate";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { AdminUsers } from "@/components/features/admin/admin-users";

export const metadata = { title: "Admin · Users" };

export default function AdminUsersPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Search accounts and manage administrator access and activation."
      />
      <AdminNav />
      <AdminGate>
        <AdminUsers />
      </AdminGate>
    </div>
  );
}
