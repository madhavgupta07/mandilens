import { PageHeader } from "@/components/domain/layout";
import { RequireAuth } from "@/components/features/app/require-auth";
import { AppNav } from "@/components/features/app/app-nav";
import { InquiriesView } from "@/components/features/app/inquiries-view";

export const metadata = { title: "Inquiries" };

export default function InquiriesPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <AppNav />
      <PageHeader
        eyebrow="Marketplace"
        title="Inquiries"
        description="Conversations started from listings. Reply to negotiate directly."
      />
      <RequireAuth>
        <InquiriesView />
      </RequireAuth>
    </div>
  );
}
