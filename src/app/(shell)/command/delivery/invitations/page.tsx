import Link from "next/link";

import { redirect } from "next/navigation";



import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";

import { InviteDeliveryPartnerForm } from "@/components/delivery/InviteDeliveryPartnerForm";

import { getPlatformPageContext } from "@/lib/platform-page-context";

import {

  DELIVERY_MANAGER_PUBLIC_LABEL,

  DELIVERY_PARTNER_PUBLIC_LABEL,

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

      title="Delivery Partner invitations"

      description={

        <>

          Invite {DELIVERY_PARTNER_PUBLIC_LABEL}s and {DELIVERY_MANAGER_PUBLIC_LABEL}s into the

          Delivery workspace. Separate from Founding Reseller invitations. Assigned partners manage

          onboarding projects from{" "}

          <Link href="/command/delivery" className="text-emerald-400 hover:underline">

            Delivery Dashboard

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

            Pending invitations and active Delivery Partners. Seat target: founding wave of 2–3.

          </p>

          {partners.length === 0 ? (

            <p className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">

              No Delivery Partner invitations yet. Send the first invitation to build the Delivery

              team.

            </p>

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

