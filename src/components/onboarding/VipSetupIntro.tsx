import { VipSetupPreferences } from "./VipSetupPreferences";
import { VipSetupReadiness } from "./VipSetupReadiness";

export function VipSetupIntro() {
  return (
    <div className="px-3 pb-4 sm:px-5">
      <VipSetupReadiness />
      <VipSetupPreferences />
    </div>
  );
}
