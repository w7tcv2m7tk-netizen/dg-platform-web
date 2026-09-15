import Image from "next/image";

export type AidaSetupPose = "welcome" | "thinking" | "working" | "presenting";

const POSE_IMAGE: Record<AidaSetupPose, string> = {
  welcome: "/aida/aida-welcome.webp",
  thinking: "/aida/aida-thinking.webp",
  working: "/aida/aida-portrait.webp",
  presenting: "/aida/aida-presenting.webp",
};

export function AidaSetupGuide({ pose, children, compact = false }: { pose: AidaSetupPose; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`mb-6 flex items-end gap-4 overflow-hidden rounded-2xl border border-violet-300/12 bg-gradient-to-r from-violet-500/[0.08] to-fuchsia-400/[0.035] px-4 ${compact ? "min-h-24" : "min-h-28"}`}>
      <div className={`relative shrink-0 self-stretch ${compact ? "w-20" : "w-24 sm:w-28"}`}>
        <Image src={POSE_IMAGE[pose]} alt="Aida" fill sizes="112px" className="object-contain object-bottom drop-shadow-xl" />
      </div>
      <div className="py-4 sm:py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">Aida · Your AI Business Partner</p>
        <div className="mt-1.5 text-sm leading-6 text-white/65">{children}</div>
      </div>
    </div>
  );
}
