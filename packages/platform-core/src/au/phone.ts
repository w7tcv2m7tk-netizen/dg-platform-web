/**
 * Australian phone presentation while typing / on blur.
 * Spaces only — does not validate completeness.
 *
 * Examples:
 * - Mobile: `0412 345 678`
 * - Landline: `02 1234 5678`
 * - +61 mobile: `+61 412 345 678`
 * - +61 landline: `+61 2 1234 5678`
 * - 1300 / 1800: `1300 123 456`
 * - 13: `13 12 12`
 */

function groups(digits: string, sizes: number[]): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of sizes) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.filter(Boolean).join(" ");
}

/** Digits only (no +). */
export function auPhoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Format an AU (or +61) phone number with standard spacing.
 * Safe for incomplete input while the user types.
 */
export function formatAuPhoneInput(input: string): string {
  if (!input) return "";

  const raw = input.replace(/[^\d+]/g, "");
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (!digits) return hasPlus ? "+" : "";

  // International AU (+61…)
  if (hasPlus || digits.startsWith("61")) {
    if (!digits.startsWith("61") && hasPlus) {
      // Other country codes — keep + and light grouping
      const capped = digits.slice(0, 15);
      return `+${groups(capped, [2, 3, 3, 3, 4])}`.trim();
    }

    digits = digits.startsWith("61") ? digits : `61${digits}`;
    const national = digits.slice(2, 11); // max 9 national digits after 61

    if (!national) return "+61";

    // Mobile: 4xxxxxxxx
    if (national.startsWith("4")) {
      return `+61 ${groups(national.slice(0, 9), [3, 3, 3])}`.trim();
    }

    // Landline / other: area + local
    return `+61 ${groups(national.slice(0, 9), [1, 4, 4])}`.trim();
  }

  // Free / local-rate
  if (digits.startsWith("1300") || digits.startsWith("1800")) {
    return groups(digits.slice(0, 10), [4, 3, 3]);
  }
  if (digits.startsWith("13") && !digits.startsWith("1300")) {
    return groups(digits.slice(0, 6), [2, 2, 2]);
  }

  // Mobile 04xx xxx xxx
  if (digits.startsWith("04") || digits.startsWith("05")) {
    return groups(digits.slice(0, 10), [4, 3, 3]);
  }

  // Landline 0X XXXX XXXX (02, 03, 07, 08)
  if (/^0[2378]/.test(digits)) {
    return groups(digits.slice(0, 10), [2, 4, 4]);
  }

  // Incomplete leading 0 / unknown — keep digits, soft-group by 4
  if (digits.startsWith("0")) {
    return groups(digits.slice(0, 10), [4, 3, 3]);
  }

  return groups(digits.slice(0, 15), [4, 3, 3, 3]);
}

/** Alias for display of stored values. */
export function formatAuPhone(input?: string | null): string {
  if (!input) return "";
  return formatAuPhoneInput(input);
}
