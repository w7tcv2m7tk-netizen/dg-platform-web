import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ClientSignIn } from "@/components/auth/ClientSignIn";
import { AuthShell } from "@/components/AuthShell";
import { getPlatformOperatorContext } from "@/lib/platform-operator";
import {
  loginAudienceCopy,
  resolvePostSignInRedirect,
} from "@/lib/login-audience";

type LoginPageProps = {
  searchParams?: Promise<{
    redirect_url?: string;
    audience?: string;
    next?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: LoginPageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const redirectUrl = params?.redirect_url ?? params?.next;
  const { title } = loginAudienceCopy({
    audience: params?.audience,
    redirectUrl,
  });
  return { title: `${title} | DigitalGate` };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const redirectUrl = params?.redirect_url ?? params?.next;
  const copy = loginAudienceCopy({
    audience: params?.audience,
    redirectUrl,
  });
  const afterSignIn = resolvePostSignInRedirect(redirectUrl, copy.audience);

  const { userId } = await auth();
  if (userId) {
    const hasExplicitDestination = Boolean(redirectUrl?.trim());
    if (!hasExplicitDestination && copy.audience === "client") {
      const operator = await getPlatformOperatorContext();
      if (operator) redirect("/command");
    }
    redirect(afterSignIn);
  }

  return (
    <AuthShell title={copy.title} subtitle={copy.subtitle}>
      <ClientSignIn redirectUrl={afterSignIn} />
    </AuthShell>
  );
}
