import { PlatformShellLoader } from "@/components/PlatformShellLoader";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformShellLoader showFloatingChat={false}>{children}</PlatformShellLoader>;
}
