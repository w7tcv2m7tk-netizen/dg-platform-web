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

test("authenticated mobile shell covers the visual viewport without a purple home-indicator strip", async () => {
  const [shell, css, brand, viewport] = await Promise.all([
    source("src/components/AppShellLayout.tsx"),
    source("src/app/globals.css"),
    source("packages/platform-core/src/org/brand-theme.ts"),
    source("src/hooks/useShellViewportHeight.ts"),
  ]);

  assert.match(shell, /useShellViewportHeight\(\)/);
  assert.match(shell, /dg-shell-underlay dg-shell-viewport fixed left-0 top-0/);
  assert.match(shell, /dg-branded-shell dg-shell-viewport absolute left-0 top-0/);
  assert.match(shell, /PLATFORM_SHELL_CHROME = "#07101d"/);
  assert.match(shell, /document\.body\.style\.background = PLATFORM_SHELL_CHROME/);
  assert.doesNotMatch(shell, /org-shell-gradient/);
  assert.doesNotMatch(shell, /h-\[100dvh\]/);
  assert.doesNotMatch(shell, /fixed inset-0 z-0/);

  assert.match(viewport, /visualViewport/);
  assert.match(viewport, /--dg-shell-height/);
  assert.match(viewport, /visual\.height \+ visual\.offsetTop/);

  assert.match(css, /--dg-shell-height, 100lvh/);
  assert.match(css, /calc\(100dvh \+ env\(safe-area-inset-bottom/);
  assert.doesNotMatch(
    css,
    /\.dg-shell-viewport \{[^}]*\binset:\s*0\b/s,
  );
  assert.match(css, /\.dg-shell-underlay\s*\{[^}]*background-color:\s*#07101d/s);

  assert.doesNotMatch(brand, /at 0% 100%/);
  assert.match(brand, /linear-gradient\(to top, #07101d/);
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
