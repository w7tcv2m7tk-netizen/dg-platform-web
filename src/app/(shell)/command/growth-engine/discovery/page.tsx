import { permanentRedirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Command Centre no longer owns Discovery.
 * Growth App = Business Discovery capability; CC = action / briefing layer.
 */
export default async function GrowthDiscoveryRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) sp.set(key, value);
  }
  const qs = sp.toString();
  permanentRedirect(`/apps/prospecting/discovery${qs ? `?${qs}` : ""}`);
}
