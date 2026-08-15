/**
 * Remove the CVH footer "Explore" column:
 *   Explore → Accommodation / Local Attractions / Currumbin Valley Guide
 */
export function stripCvhFooterExploreColumn(html) {
  if (!html || typeof html !== "string") return html;
  let next = html;

  // Comment-delimited column (seeded WP footer)
  next = next.replace(
    /<!--\s*=====?\s*COLUMN\s*3:\s*Explore[\s\S]*?<!--\s*=====?\s*COLUMN\s*4:\s*Social\s*=====?\s*-->/i,
    "<!-- ===== COLUMN 4: Social ===== -->",
  );

  // Fallback: Explore heading + links until Connect column
  next = next.replace(
    /<div\b[^>]*class=["'][^"']*footer-col[^"']*["'][^>]*>\s*<h4[^>]*>\s*Explore\s*<\/h4>[\s\S]*?<\/div>\s*(?=<div\b[^>]*class=["'][^"']*footer-col)/i,
    "",
  );

  // Drop orphan Explore links if the column wrapper already changed
  next = next.replace(
    /<li>\s*<a\b[^>]*>\s*Local Attractions\s*<\/a>\s*<\/li>/gi,
    "",
  );
  next = next.replace(
    /<li>\s*<a\b[^>]*href=["'][^"']*currumbin-valley-guide[^"']*["'][^>]*>[\s\S]*?<\/a>\s*<\/li>/gi,
    "",
  );

  return next;
}
