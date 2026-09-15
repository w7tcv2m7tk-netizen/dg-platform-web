/**
 * Uniform geometric glyph for sidebar nav items.
 *
 * Industry catalogue metadata intentionally uses expressive emoji on catalogue cards.
 * The shell is a different visual surface: convert those emoji to the same restrained
 * geometric language used by the rest of the sidebar so activated Industry templates
 * never introduce a mismatched colour/emoji icon.
 */
const SHELL_GLYPH_NORMALISATION: Record<string, string> = {
  "🏠": "◇",
  "🏨": "◫",
  "🔧": "⬡",
  "💰": "▣",
  "⚖️": "▤",
  "🏥": "◍",
  "🚗": "⬡",
  "🛍️": "▦",
  "🎨": "◈",
  "🚚": "⇄",
  "🌾": "◇",
  "🎓": "▥",
};

function normaliseSidebarGlyph(glyph: string): string {
  return SHELL_GLYPH_NORMALISATION[glyph] ?? glyph;
}

/** Uniform geometric glyph for sidebar nav items. */
export function SidebarIcon({ glyph }: { glyph: string }) {
  return (
    <span
      className="inline-flex w-4 shrink-0 justify-center text-sm leading-none text-blue-500"
      aria-hidden
    >
      {normaliseSidebarGlyph(glyph)}
    </span>
  );
}
