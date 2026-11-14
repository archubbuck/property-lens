import { AuthShell } from "@/components/auth/auth-shell";
import { DevAuthForm } from "@/components/auth/dev-auth-form";

export default function SignUpPage() {
  return (
    <AuthShell>
      <DevAuthForm mode="sign-up" />
    </AuthShell>
  );
}
