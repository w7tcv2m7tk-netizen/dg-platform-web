import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/AuthShell";
import { AUTH_AFTER_SIGN_IN_URL, AUTH_SIGN_IN_URL } from "@/lib/auth-routes";

export default async function SignUpAccountPage() {
  const { userId } = await auth();
  if (userId) {
    redirect(AUTH_AFTER_SIGN_IN_URL);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up login credentials for the client portal. You can complete plan selection and onboarding after signing in."
    >
      <SignUp
        routing="path"
        path="/signup/account"
        signInUrl={AUTH_SIGN_IN_URL}
        forceRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
        fallbackRedirectUrl={AUTH_AFTER_SIGN_IN_URL}
        oauthFlow="redirect"
      />
    </AuthShell>
  );
}
