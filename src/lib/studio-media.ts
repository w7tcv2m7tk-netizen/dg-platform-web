/**
 * Curated media available in Design Studio → Images. URLs are absolute
 * (app host) so they resolve when pasted into Studio HTML and rendered on the
 * public site. Extend this registry to add more images.
 */
const APP_ORIGIN = "https://app.digitalgate.com.au";

export type StudioMediaImage = {
  id: string;
  label: string;
  /** Root-relative path (served from public/) or absolute hosted URL. */
  src: string;
  width: number;
  height: number;
  alt: string;
  note?: string;
  /** Organisation-uploaded images can be removed from the library. */
  deletable?: boolean;
};

/** Aida — AI Business Advisor production imagery. */
export const AIDA_MEDIA: StudioMediaImage[] = [
  {
    id: "aida-presenting",
    label: "Aida — presenting",
    src: "/aida/aida-presenting.webp",
    width: 900,
    height: 1350,
    alt: "Aida, the DigitalGate AI Business Advisor",
    note: "Both hands presenting",
  },
  {
    id: "aida-welcome",
    label: "Aida — welcome",
    src: "/aida/aida-welcome.webp",
    width: 900,
    height: 1350,
    alt: "Aida, the DigitalGate AI Business Advisor",
    note: "One-hand invite",
  },
  {
    id: "aida-portrait",
    label: "Aida — portrait",
    src: "/aida/aida-portrait.webp",
    width: 900,
    height: 1350,
    alt: "Aida, the DigitalGate AI Business Advisor",
    note: "Arms crossed",
  },
  {
    id: "aida-thinking",
    label: "Aida — thinking",
    src: "/aida/aida-thinking.webp",
    width: 900,
    height: 1350,
    alt: "Aida, the DigitalGate AI Business Advisor",
    note: "Hand on chin",
  },
  {
    id: "aida-headshot",
    label: "Aida — headshot",
    src: "/aida/aida-headshot.webp",
    width: 720,
    height: 660,
    alt: "Aida, the DigitalGate AI Business Advisor",
  },
  {
    id: "aida-avatar",
    label: "Aida — avatar",
    src: "/aida/aida-avatar.webp",
    width: 512,
    height: 512,
    alt: "Aida, the DigitalGate AI Business Advisor",
    note: "Square · small / circular",
  },
];

export function mediaAbsoluteUrl(src: string): string {
  const trimmed = src.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${APP_ORIGIN}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function attr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function mediaImgSnippet(m: StudioMediaImage): string {
  const size =
    m.width > 0 && m.height > 0 ? ` width="${m.width}" height="${m.height}"` : "";
  return `<img src="${attr(mediaAbsoluteUrl(m.src))}"${size} alt="${attr(m.alt)}" loading="lazy" decoding="async">`;
}
