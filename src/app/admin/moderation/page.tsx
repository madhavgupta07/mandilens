import { PageHeader } from "@/components/domain/layout";
import { AdminGate } from "@/components/features/admin/admin-gate";
import { AdminNav } from "@/components/features/admin/admin-nav";
import { AdminModeration } from "@/components/features/admin/admin-moderation";

export const metadata = { title: "Admin · Moderation" };

export default function AdminModerationPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <PageHeader
        eyebrow="Admin"
        title="Moderation"
        description="Review reported listings and remove or dismiss them."
      />
      <AdminNav />
      <AdminGate>
        <AdminModeration />
      </AdminGate>
    </div>
  );
}
