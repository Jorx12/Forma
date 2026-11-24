// Genera les icones PNG a partir dels SVG de public/icons (requereix Playwright).
//   icon.svg          → icona arrodonida (favicon, Android)
//   icon-square.svg   → sense cantonades (l'iPhone les arrodoneix sol)
//   icon-maskable.svg → fons a sang i dibuix dins la zona segura (Android adaptatiu)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright pot estar instal·lat globalment: el resolem amb require
const { chromium } = createRequire(import.meta.url)('playwright');

const dir = new URL('../public/icons/', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(svgFile, size, out, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  const svg = read(svgFile).replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: new URL(out, dir).pathname, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

await render('icon.svg', 192, 'icon-192.png', true);
await render('icon.svg', 512, 'icon-512.png', true);
await render('icon-maskable.svg', 512, 'icon-512-maskable.png');
await render('icon-square.svg', 180, 'apple-touch-icon.png');
await render('icon.svg', 32, 'favicon-32.png', true);
await browser.close();
console.log('Icones generades');
