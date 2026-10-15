import Link from "next/link";
import { AuthShell } from "@/components/features/auth-shell";
import { RegisterForm } from "@/components/features/auth/register-form";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free and open source. Track markets, post listings and get grounded AI answers."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
