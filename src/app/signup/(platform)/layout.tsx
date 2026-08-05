import { PlatformShell } from "@/components/PlatformShell";

export default function SignupPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShell>{children}</PlatformShell>;
}
