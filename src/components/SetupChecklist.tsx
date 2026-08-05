import type { PortalSetup } from "@/lib/dg-api";

function CheckItem({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className={done ? "text-emerald-400" : "text-slate-500"}>
        {done ? "✓" : "○"}
      </span>
      <span className={done ? "text-slate-200" : "text-slate-400"}>
        {children}
      </span>
    </li>
  );
}

export function SetupChecklist({
  setup,
  linked,
}: {
  setup: PortalSetup;
  linked: boolean;
}) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      <CheckItem done={setup.account_created}>Account created</CheckItem>
      <CheckItem done={setup.payment_done}>Payment received</CheckItem>
      <CheckItem done={setup.onboarding_done}>Onboarding form complete</CheckItem>
      <CheckItem done={setup.platform_live}>Platform live on your site</CheckItem>
      {!linked ? (
        <li className="mt-3 text-sm text-amber-300/90">
          CRM profile not linked yet — complete onboarding with the same email,
          or contact support.
        </li>
      ) : null}
    </ul>
  );
}
