import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function FoundingResellerInviteAppRedirect({ params }: Props) {
  const { token } = await params;
  redirect(
    `https://digitalgate.com.au/founding-resellers/invite/${encodeURIComponent(token)}`,
  );
}
