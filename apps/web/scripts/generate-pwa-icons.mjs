// Regenerates apps/web/public/icons/* and public/favicon.ico from the
// LogoMark component. Run: pnpm --filter @matchiq/web icons:generate
// Uses only existing dev dependencies: jiti (TSX loading), react-dom/server
// (markup) and Playwright's Chromium (rasterising).
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { chromium } from '@playwright/test';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(WEB_ROOT, 'public');
const ICON_DIR = join(PUBLIC_DIR, 'icons');

const jiti = createJiti(import.meta.url, { jsx: true, fsCache: false });
const React = await jiti.import('react');
// jiti compiles JSX with the classic runtime, which expects a global React.
globalThis.React = React;
const { createElement } = React;
const { renderToStaticMarkup } = await jiti.import('react-dom/server');
const { LogoMark } = await jiti.import(
  join(WEB_ROOT, 'src/components/icons/logo-mark.tsx'),
);
const { PWA_COLORS } = await jiti.import(
  join(WEB_ROOT, 'src/constants/pwa.ts'),
);

/**
 * `inset` is the logo's share of the canvas. Maskable icons keep the mark
 * inside the central 80% safe zone; "rounded" icons draw their own tile
 * because purpose "any" is shown unmasked.
 */
const VARIANTS = [
  { file: 'icon-192.png', size: 192, inset: 0.62, rounded: true },
  { file: 'icon-512.png', size: 512, inset: 0.62, rounded: true },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.66, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.6, rounded: false },
];
const FAVICON_SIZES = [16, 32, 48];
/** Thicker strokes keep the mark legible at favicon sizes. */
const FAVICON_STROKE = 2.75;

const logoMarkup = (size, strokeWidth) =>
  renderToStaticMarkup(
    createElement(LogoMark, {
      size,
      strokeWidth,
      style: { color: PWA_COLORS.accent },
    }),
  );

const tileSvg = ({ size, inset, rounded, strokeWidth = 2 }) => {
  const logo = Math.round(size * inset);
  const offset = (size - logo) / 2;
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const mark = logoMarkup(logo, strokeWidth).replace(
    '<svg ',
    `<svg x="${offset}" y="${offset}" `,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${PWA_COLORS.dark}"/>${mark}</svg>`;
};

const rasterise = async (page, svg, size) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg}</body></html>`,
  );
  return page.locator('svg').first().screenshot({ omitBackground: true });
};

/** ICO container with embedded PNG entries (supported since Windows Vista). */
const toIco = (images) => {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
};

await mkdir(ICON_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const variant of VARIANTS) {
    const png = await rasterise(page, tileSvg(variant), variant.size);
    await writeFile(join(ICON_DIR, variant.file), png);
  }
  const favicons = [];
  for (const size of FAVICON_SIZES) {
    const svg = tileSvg({
      size,
      inset: 0.8,
      rounded: true,
      strokeWidth: FAVICON_STROKE,
    });
    favicons.push({ size, png: await rasterise(page, svg, size) });
  }
  await writeFile(join(PUBLIC_DIR, 'favicon.ico'), toIco(favicons));
  await writeFile(
    join(ICON_DIR, 'icon.svg'),
    `${tileSvg({ size: 512, inset: 0.62, rounded: true })}\n`,
  );
} finally {
  await browser.close();
}
