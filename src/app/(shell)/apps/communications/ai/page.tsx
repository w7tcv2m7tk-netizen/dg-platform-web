import { redirect } from "next/navigation";

/** AI tooling lives under AI Conversations top nav — not a sidebar group. */
export default function CommunicationsAiRedirectPage() {
  redirect("/apps/ai-communications/inbox");
}
