import type {
  BusinessContext,
  CommerceBuyerDetails,
  CommerceLineItem,
  OrganisationBusinessProfile,
} from "@dg/platform-core";
import { absoluteBrandAssetUrl, formatAbn } from "@dg/platform-core";

function money(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatAddress(profile: OrganisationBusinessProfile | null | undefined) {
  const a = profile?.address;
  if (!a) return profile?.locations?.[0]
    ? [
        profile.locations[0].street,
        [profile.locations[0].city, profile.locations[0].state, profile.locations[0].postcode]
          .filter(Boolean)
          .join(" "),
        profile.locations[0].country,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  return [
    a.street,
    [a.city, a.state, a.postcode].filter(Boolean).join(" "),
    a.country,
  ]
    .filter(Boolean)
    .join("\n");
}

function DocumentBrandMark({
  logoUrl,
  iconUrl,
  businessName,
}: {
  logoUrl?: string;
  iconUrl?: string;
  businessName: string;
}) {
  const logoSrc = absoluteBrandAssetUrl(logoUrl);
  const iconSrc = absoluteBrandAssetUrl(iconUrl) || logoSrc;
  const wordmarkSrc = logoSrc || iconSrc;

  if (!wordmarkSrc && !iconSrc) {
    return <p className="au-document__brand-name">{businessName}</p>;
  }

  const showIconBesideLogo = Boolean(
    iconSrc && wordmarkSrc && iconSrc !== wordmarkSrc,
  );

  return (
    <div className="au-document__brand-lockup">
      {showIconBesideLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconSrc!}
          alt=""
          className="au-document__icon"
          width={56}
          height={56}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={wordmarkSrc!}
        alt={businessName}
        className={
          showIconBesideLogo || logoSrc
            ? "au-document__logo"
            : "au-document__icon au-document__icon--solo"
        }
      />
    </div>
  );
}

export type CommerceDocumentViewProps = {
  kind: "invoice" | "quote";
  documentNumber: string | null;
  status: string;
  issuedAt: Date | string;
  dueAt?: Date | string | null;
  validUntil?: Date | string | null;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  lineItems: CommerceLineItem[];
  notes?: string | null;
  taxInclusive?: boolean;
  buyer?: CommerceBuyerDetails | null;
  contact?: {
    name?: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  business: BusinessContext;
};

export function CommerceDocumentView(props: CommerceDocumentViewProps) {
  const profile = props.business.profile;
  const identity = props.business.identity;
  const contact = props.business.contact;
  const bank = profile?.bankDetails;
  const gstRegistered =
    profile?.taxSettings?.gstRegistered ?? Boolean(identity.abn);
  const legalName = identity.businessName;
  const tradingName =
    identity.tradingName && identity.tradingName !== legalName
      ? identity.tradingName
      : null;

  const title =
    props.kind === "invoice"
      ? gstRegistered && props.taxCents > 0
        ? "Tax Invoice"
        : "Invoice"
      : "Quotation";

  const issued = new Date(props.issuedAt);
  const billToName =
    props.buyer?.name ||
    props.contact?.name ||
    "Customer";
  const billToLines = [
    props.buyer?.address,
    props.buyer?.email || props.contact?.email,
    props.buyer?.phone || props.contact?.phone,
    props.buyer?.abn ? `ABN ${formatAbn(props.buyer.abn)}` : null,
  ].filter(Boolean);

  const supplierAddress = formatAddress(profile);
  const phone = contact.businessPhone || contact.primaryPhone;
  const email = contact.businessEmail || contact.primaryEmail;

  return (
    <article className="au-document print:shadow-none">
      <header className="au-document__letterhead">
        <div className="au-document__brand">
          <DocumentBrandMark
            logoUrl={identity.logoUrl ?? profile?.logoUrl}
            iconUrl={identity.iconUrl ?? profile?.iconUrl}
            businessName={legalName}
          />
          {tradingName ? (
            <p className="au-document__trading">Trading as {tradingName}</p>
          ) : null}
          <div className="au-document__supplier-meta">
            {identity.abn ? <p>ABN {formatAbn(identity.abn)}</p> : null}
            {identity.acn ? <p>ACN {identity.acn}</p> : null}
            {supplierAddress
              ? supplierAddress.split("\n").map((line) => <p key={line}>{line}</p>)
              : null}
            {phone ? <p>{phone}</p> : null}
            {email ? <p>{email}</p> : null}
          </div>
        </div>
        <div className="au-document__title-block">
          <h1 className="au-document__title">{title}</h1>
          <dl className="au-document__meta">
            <div>
              <dt>{props.kind === "invoice" ? "Invoice no." : "Quote no."}</dt>
              <dd>{props.documentNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{issued.toLocaleDateString("en-AU")}</dd>
            </div>
            {props.kind === "invoice" && props.dueAt ? (
              <div>
                <dt>Due date</dt>
                <dd>{new Date(props.dueAt).toLocaleDateString("en-AU")}</dd>
              </div>
            ) : null}
            {props.kind === "quote" && props.validUntil ? (
              <div>
                <dt>Valid until</dt>
                <dd>{new Date(props.validUntil).toLocaleDateString("en-AU")}</dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd className="capitalize">{props.status.replace(/_/g, " ")}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="au-document__parties">
        <div>
          <h2>Bill to</h2>
          <p className="au-document__party-name">{billToName}</p>
          {billToLines.map((line) => (
            <p key={String(line)}>{line}</p>
          ))}
        </div>
        <div>
          <h2>From</h2>
          <p className="au-document__party-name">{legalName}</p>
          {identity.abn ? <p>ABN {formatAbn(identity.abn)}</p> : null}
        </div>
      </section>

      <table className="au-document__lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">
              {props.taxInclusive ? "Unit (inc GST)" : "Unit (ex GST)"}
            </th>
            <th className="num">GST</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {props.lineItems.map((item, idx) => {
            const lineGross = Math.round(item.quantity * item.unitAmountCents);
            const rateBps = item.taxRateBps ?? 0;
            let lineTax = 0;
            let lineAmount = lineGross;
            if (rateBps) {
              if (props.taxInclusive) {
                lineTax = Math.round((lineGross * rateBps) / (10000 + rateBps));
                lineAmount = lineGross;
              } else {
                lineTax = Math.round((lineGross * rateBps) / 10000);
                lineAmount = lineGross + lineTax;
              }
            }
            return (
              <tr key={`${item.description}-${idx}`}>
                <td>
                  {item.description}
                  {item.taxCode ? (
                    <span className="au-document__tax-code"> {item.taxCode}</span>
                  ) : null}
                </td>
                <td className="num">{item.quantity}</td>
                <td className="num">{money(item.unitAmountCents, props.currency)}</td>
                <td className="num">{money(lineTax, props.currency)}</td>
                <td className="num">{money(lineAmount, props.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <section className="au-document__totals">
        <dl>
          <div>
            <dt>Subtotal (ex GST)</dt>
            <dd>{money(props.subtotalCents, props.currency)}</dd>
          </div>
          <div>
            <dt>GST</dt>
            <dd>{money(props.taxCents, props.currency)}</dd>
          </div>
          <div className="au-document__grand">
            <dt>Total {props.currency}</dt>
            <dd>{money(props.totalCents, props.currency)}</dd>
          </div>
        </dl>
      </section>

      {props.kind === "invoice" && bank && (bank.bsb || bank.accountNumber) ? (
        <section className="au-document__payment">
          <h2>Payment details</h2>
          {bank.bankName ? <p>{bank.bankName}</p> : null}
          {bank.accountName ? <p>Account name: {bank.accountName}</p> : null}
          {bank.bsb ? <p>BSB: {bank.bsb}</p> : null}
          {bank.accountNumber ? <p>Account number: {bank.accountNumber}</p> : null}
          <p>
            {bank.paymentReferenceHint ||
              `Please quote ${props.documentNumber ?? "invoice number"} as reference`}
          </p>
        </section>
      ) : null}

      {props.notes ? (
        <section className="au-document__notes">
          <h2>Notes</h2>
          <p>{props.notes}</p>
        </section>
      ) : null}

      <footer className="au-document__footer">
        {gstRegistered && props.kind === "invoice" && props.taxCents > 0 ? (
          <p>This document is a tax invoice for GST purposes (Australia).</p>
        ) : null}
        {!identity.abn ? (
          <p className="au-document__warn">
            Add your ABN on Business Profile for a complete Australian tax invoice.
          </p>
        ) : null}
      </footer>
    </article>
  );
}
