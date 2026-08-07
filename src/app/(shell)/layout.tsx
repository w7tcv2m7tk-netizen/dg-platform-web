import { PlatformShellLoader } from "@/components/PlatformShellLoader";

/**
 * Shared authenticated shell — keeps sidebar/header mounted across
 * /dashboard, /apps/*, /command/*, /support, and /onboarding navigations.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader>{children}</PlatformShellLoader>;
}
