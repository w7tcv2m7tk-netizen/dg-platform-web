import { PageSkeleton } from "@/components/platform/DashboardSkeleton";

/** Keep shell chrome painted while an app route loads. */
export default function AppsLoading() {
  return <PageSkeleton />;
}
