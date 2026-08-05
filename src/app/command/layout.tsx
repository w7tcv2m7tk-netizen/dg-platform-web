import { PlatformShell } from "@/components/PlatformShell";

export default function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShell>{children}</PlatformShell>;
}
