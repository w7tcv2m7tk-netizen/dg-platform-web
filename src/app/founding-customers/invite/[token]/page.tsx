import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function FoundingInviteAppRedirect({ params }: Props) {
  const { token } = await params;
  redirect(
    `https://digitalgate.com.au/founding-customers/invite/${encodeURIComponent(token)}`,
  );
}
