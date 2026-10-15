import { PageHeader } from "@/components/domain/layout";
import { RequireAuth } from "@/components/features/app/require-auth";
import { AppNav } from "@/components/features/app/app-nav";
import { SavedView } from "@/components/features/app/saved-view";

export const metadata = { title: "Saved comparisons" };

export default function SavedPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <AppNav />
      <PageHeader
        eyebrow="Your work"
        title="Saved comparisons"
        description="Comparisons you named in the workbench, kept for later reference."
      />
      <RequireAuth>
        <SavedView />
      </RequireAuth>
    </div>
  );
}
