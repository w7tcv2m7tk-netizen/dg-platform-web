import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ProspectingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  redirect((await searchParams).view === "overview" ? "/apps/prospecting/overview" : "/apps/prospecting/today");
}
