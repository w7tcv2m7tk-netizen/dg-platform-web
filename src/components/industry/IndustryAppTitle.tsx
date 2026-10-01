import { AppPageHeader } from "@/components/ui/AppPageHeader";

export function IndustryAppTitle({
  title,
  description,
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return <AppPageHeader family={eyebrow ?? "Industry App"} title={title} description={description} />;
}
