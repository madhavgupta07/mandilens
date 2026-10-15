import Link from "next/link";
import { AuthShell } from "@/components/features/auth-shell";
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send instructions to reset it."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
