import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/features/auth-shell";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something strong you haven't used before."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
