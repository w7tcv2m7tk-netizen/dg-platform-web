import Link from "next/link";

/**
 * @deprecated AppContextNav owns Communications tabs. Do not mount.
 */
export function CommsSubnav(_props: { active: string }) {
  return null;
}

/** @deprecated Prefer AppContextNav. */
export function CommunicationsLegacyLink() {
  return (
    <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
      Communications →
    </Link>
  );
}
