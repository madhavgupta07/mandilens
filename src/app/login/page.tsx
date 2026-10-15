import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/features/auth-shell";
import { LoginForm } from "@/components/features/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to save comparisons, message traders and set alerts."
      footer={
        <>
          New to MandiLens?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
