import { PageSkeleton } from "@/components/platform/DashboardSkeleton";

/** Keep shell chrome painted while Command Centre routes load. */
export default function CommandLoading() {
  return <PageSkeleton />;
}
