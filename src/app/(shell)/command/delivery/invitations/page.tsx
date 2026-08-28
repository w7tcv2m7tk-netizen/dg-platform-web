import Link from "next/link";
import { redirect } from "next/navigation";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { InviteDeliveryPartnerForm } from "@/components/delivery/InviteDeliveryPartnerForm";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  DELIVERY_MANAGER_PUBLIC_LABEL,
  DELIVERY_PARTNER_PUBLIC_LABEL,
  FOUNDING_IMPLEMENTATION_TARGET,
  listPartners,
} from "@dg/platform-core";

export default async function StaffDeliveryInvitationsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  let partners: Awaited<ReturnType<typeof listPartners>>["partners"] = [];
  try {
    const listed = await listPartners({
      partnerType: "IMPLEMENTATION_PARTNER",
      limit: 100,
    });
    partners = listed.partners;
  } catch {
    /* tables not migrated yet */
  }

  return (
    <DeliveryCommandPage
      title="Delivery Invitations"
      description={
        <>
          Invite Delivery Partners and Delivery Managers into the DigitalGate Delivery workspace.
          This is separate from Founding Acquisition Partner invitations. Delivery Partners support customer
          implementation and are assigned to implementation projects through the{" "}
          <Link href="/command/delivery" className="text-emerald-400 hover:underline">
            Delivery workspace
          </Link>
          .
        </>
      }
      navActive="invitations"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <InviteDeliveryPartnerForm />
        <div className="dg-card space-y-3">
          <h2 className="font-semibold text-white">Invitation pipeline</h2>
          <p className="text-sm text-slate-400">
            Pending invitations and active Delivery team members.
          </p>
          <p className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 px-3 py-2 text-xs text-emerald-100/90">
            Founding delivery wave: 2–{FOUNDING_IMPLEMENTATION_TARGET}
            <span className="mt-1 block text-emerald-100/60">
              Recruitment focus for the current wave — not a hard seat limit.
            </span>
          </p>
          {partners.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center">
              <p className="font-medium text-white">No Delivery invitations yet.</p>
              <p className="mt-2 text-sm text-slate-400">
                Invite your first Delivery Partner or Delivery Manager to begin building the
                DigitalGate implementation team.
              </p>
              <a
                href="#invite-delivery"
                className="mt-4 inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Invite Delivery Partner
              </a>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {partners.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <Link
                      href={`/command/partners/${p.id}`}
                      className="font-medium text-white hover:underline"
                    >
                      {p.displayName || p.email || "Unnamed"}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {p.businessName || "—"} ·{" "}
                      {p.deliveryRole === "lead"
                        ? DELIVERY_MANAGER_PUBLIC_LABEL
                        : DELIVERY_PARTNER_PUBLIC_LABEL}
                    </p>
                    {p.email ? <p className="text-xs text-slate-500">{p.email}</p> : null}
                  </div>
                  <div className="text-right text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        p.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : p.status === "inactive"
                            ? "bg-slate-700 text-slate-400"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {p.invitationStatus || p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DeliveryCommandPage>
  );
}
