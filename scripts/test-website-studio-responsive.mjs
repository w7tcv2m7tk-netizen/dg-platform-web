import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(path, "utf8");
}

test("authenticated shell switches from fixed sidebar to a mobile drawer", async () => {
  const [shell, breakpoint] = await Promise.all([
    source("src/components/AppShellLayout.tsx"),
    source("src/hooks/useIsDesktopShell.ts"),
  ]);

  assert.match(breakpoint, /\(min-width:\s*768px\)/);
  assert.match(shell, /!isDesktop\s*\?\s*<MobileHeader/);
  assert.match(shell, /w-\[min\(18rem,88vw\)\]/);
  assert.match(shell, /min-w-0 flex-1 flex-col overflow-hidden/);
  assert.match(shell, /overflow-x-clip overflow-y-auto/);
});

test("Website Studio collapses its desktop editor grid on narrow viewports", async () => {
  const studio = await source("src/components/websites/WebsiteStudioClient.tsx");

  assert.match(studio, /className="grid gap-6 lg:grid-cols-\[13rem_minmax\(0,1fr\)_24rem\]/);
  assert.match(studio, /flex flex-wrap items-center gap-3 justify-between/);
  assert.match(studio, /className="flex flex-wrap gap-2"/);
  assert.match(studio, /className="space-y-4 min-w-0"/);
  assert.match(studio, /max-h-\[70vh\]/);
});

test("Studio image library uses responsive grids and wrapping upload controls", async () => {
  const images = await source("src/components/websites/StudioImagesPanel.tsx");

  assert.match(images, /flex flex-wrap items-center justify-between gap-3/);
  assert.match(images, /grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4/);
});

test("Studio SEO fields are fluid instead of fixed-width", async () => {
  const seo = await source("src/components/websites/StudioSeoPanel.tsx");

  assert.match(seo, /w-full rounded-md/);
  assert.match(seo, /max-w-2xl/);
  assert.doesNotMatch(seo, /w-\[(?:[4-9]\d\d|\d{4,})px\]/);
});
