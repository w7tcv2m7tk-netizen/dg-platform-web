import { PlatformShellLoader } from "@/components/PlatformShellLoader";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader>{children}</PlatformShellLoader>;
}
