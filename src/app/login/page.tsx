import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Client login"
      subtitle="Sign in to your DigitalGate platform dashboard."
    >
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/signup/account"
        forceRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
