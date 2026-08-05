import { PlatformShell } from "@/components/PlatformShell";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShell>{children}</PlatformShell>;
}
