// Genera les icones PNG a partir de public/icons/icon.svg (requereix Playwright).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright pot estar instal·lat globalment: el resolem amb require
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (f) => new URL(`../public/icons/${f}`, import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, file, { maskable = false, rounded = true } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable || !rounded ? svg.replace('rx="112"', 'rx="0"') : svg;
  const scale = maskable ? 0.8 : 1;
  await page.setContent(`<html><body style="margin:0;background:#0b0d10;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
    <div style="width:${size * scale}px;height:${size * scale}px">${inner.replace('<svg ', `<svg width="${size * scale}" height="${size * scale}" `)}</div></body></html>`);
  await page.screenshot({ path: out(file), omitBackground: rounded && !maskable });
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-512-maskable.png', { maskable: true });
await render(180, 'apple-touch-icon.png', { rounded: false });
await browser.close();
console.log('Icones generades');
