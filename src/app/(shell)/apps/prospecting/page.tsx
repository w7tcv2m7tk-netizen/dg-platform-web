import ProspectingTodayPage from "./today/page";
import ProspectingOverview from "@/components/prospecting/ProspectingOverview";
export const dynamic = "force-dynamic";
export default async function ProspectingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return (await searchParams).view === "overview" ? <ProspectingOverview /> : <ProspectingTodayPage />;
}
