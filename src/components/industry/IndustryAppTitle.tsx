import { AppPageHeader } from "@/components/ui/AppPageHeader";

export function IndustryAppTitle({
  title,
  description,
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return <AppPageHeader family="Industry App" title={title} description={description} />;
}
