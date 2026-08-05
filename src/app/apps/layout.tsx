import { PlatformShell } from "@/components/PlatformShell";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShell>{children}</PlatformShell>;
}
