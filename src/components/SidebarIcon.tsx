/** Uniform geometric glyph for sidebar nav items. */
export function SidebarIcon({ glyph }: { glyph: string }) {
  return (
    <span
      className="inline-flex w-4 shrink-0 justify-center text-sm leading-none text-blue-500"
      aria-hidden
    >
      {glyph}
    </span>
  );
}
