/** Wantd wordmark + mark. Lowercase identity; missing “e” is the brand. */

export function WantdIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Wantd"
    >
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#121212" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fill="#C6F04A"
        fontFamily="Syne, Outfit, system-ui, sans-serif"
        fontSize="34"
        fontWeight="800"
        letterSpacing="-1.5"
      >
        d
      </text>
    </svg>
  );
}

export function WantdWordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 92"
      role="img"
      aria-label="wantd"
    >
      <text
        x="210"
        y="68"
        textAnchor="middle"
        fill="#121212"
        fontFamily="Syne, Outfit, system-ui, sans-serif"
        fontSize="72"
        fontWeight="800"
        letterSpacing="-3.5"
      >
        wantd
      </text>
    </svg>
  );
}
