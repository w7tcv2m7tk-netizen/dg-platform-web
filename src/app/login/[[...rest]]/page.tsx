import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/AuthShell";
import { AUTH_AFTER_SIGN_IN_URL } from "@/lib/auth-routes";

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) {
    redirect(AUTH_AFTER_SIGN_IN_URL);
  }

  return (
    <AuthShell
      title="Client login"
      subtitle="Sign in to your DigitalGate platform dashboard."
    >
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/signup/account"
        forceRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
        fallbackRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
        oauthFlow="redirect"
      />
    </AuthShell>
  );
}
