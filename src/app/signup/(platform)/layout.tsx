import { PlatformShellLoader } from "@/components/PlatformShellLoader";

export default function SignupPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader>{children}</PlatformShellLoader>;
}
