import fs from 'node:fs';
const source = fs.readFileSync('src/components/onboarding/ConnectBusinessSetup.tsx','utf8');
const required = ['Pending provider access','Lend can report its live configured and verification state','provider credentials or approval','Scale or Enterprise','setStep("review")'];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Missing Setup 2 state-awareness guard: ${token}`);
}
if (source.includes('href:"/dashboard/settings/connected-services"')) throw new Error('Setup 2 must not detour to generic Connected Services');
console.log('Setup 2 state-awareness regression guard passed');
