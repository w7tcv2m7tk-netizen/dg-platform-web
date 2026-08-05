import { PlatformShell } from "@/components/PlatformShell";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShell showSupportChat={false}>{children}</PlatformShell>;
}
