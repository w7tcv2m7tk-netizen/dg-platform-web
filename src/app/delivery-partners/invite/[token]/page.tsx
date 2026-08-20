import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function DeliveryPartnerInviteAppRedirect({ params }: Props) {
  const { token } = await params;
  redirect(
    `https://digitalgate.com.au/delivery-partners/invite/${encodeURIComponent(token)}`,
  );
}
