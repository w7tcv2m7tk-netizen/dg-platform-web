import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ClientSignIn } from "@/components/auth/ClientSignIn";
import { AuthShell } from "@/components/AuthShell";
import { AUTH_AFTER_SIGN_IN_URL } from "@/lib/auth-routes";

type LoginPageProps = {
  searchParams?: Promise<{ redirect_url?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { userId } = await auth();
  if (userId) {
    redirect(AUTH_AFTER_SIGN_IN_URL);
  }

  const params = searchParams ? await searchParams : undefined;
  const redirectUrl = params?.redirect_url;

  return (
    <AuthShell
      title="Client login"
      subtitle="Sign in with your email and password to open the DigitalGate platform dashboard."
    >
      <ClientSignIn redirectUrl={redirectUrl} />
    </AuthShell>
  );
}
