import { PageSkeleton } from "@/components/platform/DashboardSkeleton";

/** Content-area skeleton while a shell route segment loads — chrome stays painted. */
export default function ShellLoading() {
  return <PageSkeleton />;
}
