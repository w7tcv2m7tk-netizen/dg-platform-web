/**
 * Curated media available in Website Studio's "Images" panel. URLs are absolute
 * (app host) so they resolve when pasted into Studio HTML and rendered on the
 * public site. Extend this registry to add more images.
 */
const APP_ORIGIN = "https://app.digitalgate.com.au";

export type StudioMediaImage = {
  id: string;
  label: string;
  /** Root-relative path (served from public/) — used for in-app thumbnails. */
  src: string;
  width: number;
  height: number;
  alt: string;
  note?: string;
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

export type StudioMediaGroup = { group: string; images: StudioMediaImage[] };

export const STUDIO_MEDIA: StudioMediaGroup[] = [
  { group: "Aida — AI Business Advisor", images: AIDA_MEDIA },
];

export function mediaAbsoluteUrl(src: string): string {
  return `${APP_ORIGIN}${src}`;
}

export function mediaImgSnippet(m: StudioMediaImage): string {
  return `<img src="${mediaAbsoluteUrl(m.src)}" width="${m.width}" height="${m.height}" alt="${m.alt}" loading="lazy" decoding="async">`;
}
