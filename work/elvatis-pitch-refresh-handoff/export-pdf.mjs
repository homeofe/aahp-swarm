// Robust HTML-deck -> PDF export (image-based, bulletproof across viewers).
//
// Each 1280x720 slide is rendered to a high-res PNG (web fonts loaded first),
// then the PNGs are assembled into a PDF, one slide per page. The PDF contains
// only images, so there are NO PDF shadings and NO font edge-cases - it renders
// identically in every viewer. This fixes the broken formatting that came from
// CSS radial-gradients being exported as type-1 PDF shadings (which several
// viewers rendered as solid magenta blobs).
//
// Usage:  node export-pdf.mjs
// Needs:  npm install puppeteer-core pdf-lib   (uses the installed Chrome)

import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const deckDir = path.join(dir, 'outputs', 'aahp-swarm-elvatis-html');
// CLI: node export-pdf.mjs [htmlFile] [outputPdf]   (defaults to the English deck)
const htmlName = process.argv[2] || 'index.html';
const outName = process.argv[3] || 'AAHP_Swarm_Elvatis_HTML_Render_fixed.pdf';
const htmlUrl = 'file:///' + path.join(deckDir, htmlName).replace(/\\/g, '/');
const outPdf = path.join(deckDir, outName);
const qaDir = path.join(dir, htmlName.includes('-de') ? 'qa-de' : 'qa-fixed');
fs.mkdirSync(qaDir, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
// Viewport wider than the deck's 1320px responsive breakpoint so slides render
// at native 1280x720; deviceScaleFactor 2 for crisp output.
await page.setViewport({ width: 1360, height: 820, deviceScaleFactor: 2 });
await page.goto(htmlUrl, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(async () => {
  await document.fonts.ready;
});
await new Promise((r) => setTimeout(r, 300)); // settle layout

const slides = await page.$$('.slide');
const pdfDoc = await PDFDocument.create();
const PAGE_W = 960; // 16:9 widescreen (PowerPoint), points
const PAGE_H = 540;

for (let i = 0; i < slides.length; i++) {
  const buf = await slides[i].screenshot({ type: 'png' });
  fs.writeFileSync(path.join(qaDir, `slide-${i + 1}.png`), buf);
  const png = await pdfDoc.embedPng(buf);
  const pdfPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pdfPage.drawImage(png, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
}

fs.writeFileSync(outPdf, await pdfDoc.save());
await browser.close();
console.log(`OK: image-based PDF with ${slides.length} slides -> ${outPdf}`);
