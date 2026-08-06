import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";

export default function SignUpAccountPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up login credentials for the client portal. You can complete plan selection and onboarding after signing in."
    >
      <SignUp
        routing="path"
        path="/signup/account"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
