/**
 * Previously redirected DigitalGate staff from /apps/prospecting/* to Command Centre.
 * Growth Apps now use the same /apps/prospecting/* routes for all orgs — no-op retained
 * so any leftover call sites stay safe.
 */
export async function redirectStaffProspectingIfNeeded(_currentPath: string) {
  return;
}
