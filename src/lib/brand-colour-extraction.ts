import sharp from "sharp";

type Rgb = { r: number; g: number; b: number; count: number };

function hex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function saturation(c: Rgb): number {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return max === 0 ? 0 : (max - min) / max;
}

function luminance(c: Rgb): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

function distance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/**
 * Extract two useful UI brand colours from a supplied logo.
 * Transparent pixels, near-white canvas backgrounds and near-black text are
 * deprioritised so the actual brand marks win where possible.
 */
export async function extractBrandColours(buffer: Buffer): Promise<[string, string] | null> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: 96, height: 96, fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Map<string, Rgb>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!, a = data[i + 3]!;
    if (a < 80) continue;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum > 0.94) continue;
    // Quantise to 32-value buckets to make antialiased logo pixels converge.
    const qr = Math.min(255, Math.round(r / 32) * 32);
    const qg = Math.min(255, Math.round(g / 32) * 32);
    const qb = Math.min(255, Math.round(b / 32) * 32);
    const key = `${qr},${qg},${qb}`;
    const existing = bins.get(key);
    if (existing) existing.count += 1;
    else bins.set(key, { r: qr, g: qg, b: qb, count: 1 });
  }

  const all = [...bins.values()];
  if (!all.length) return null;

  const colourful = all.filter((c) => luminance(c) > 0.07 && saturation(c) >= 0.16);
  const candidates = (colourful.length ? colourful : all.filter((c) => luminance(c) > 0.05))
    .sort((a, b) => (b.count * (1 + saturation(b))) - (a.count * (1 + saturation(a))));

  const primary = candidates[0];
  if (!primary) return null;
  const accent =
    candidates.find((c) => distance(primary, c) >= 80) ??
    candidates.find((c) => distance(primary, c) >= 45) ??
    primary;

  return [hex(primary), hex(accent)];
}
