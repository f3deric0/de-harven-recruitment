#!/usr/bin/env node
/**
 * Downloads brand assets from the current de-harven-recruitment.com (Wix)
 * site and Google Fonts, and stores them locally under public/assets/.
 * Run once during setup: `npm run fetch-assets`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOGO_DIR = path.join(ROOT, 'public/assets/logo');
const IMG_DIR = path.join(ROOT, 'public/assets/img');
const FONT_DIR = path.join(ROOT, 'public/assets/fonts');

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function download(url, dest, label) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed ${label}: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`✓ ${label} → ${path.relative(ROOT, dest)} (${(buf.length / 1024).toFixed(1)} KB)`);
}

// Source images identified on the live Wix site (public media CDN URLs).
const WIX_MEDIA = {
  oliveTreeLogo: 'b48f19_7fcfdfe827ab4543ba9dfd30458a889d',
  wordmarkLockup: 'b48f19_8bb2339513a64e38958a5b904f2ba36c',
  pierrePortrait: 'b48f19_dfc8c5620ac345d6be7f7c72363d5707',
};

const FONTS = [
  { family: 'Forum', weight: '400', file: 'forum-400.woff2' },
  { family: 'Cormorant Garamond', weight: '300', file: 'cormorant-300.woff2' },
  { family: 'Cormorant Garamond', weight: '400', file: 'cormorant-400.woff2' },
  { family: 'Cormorant Garamond', weight: '500', file: 'cormorant-500.woff2' },
  { family: 'Jost', weight: '300', file: 'jost-300.woff2' },
  { family: 'Jost', weight: '400', file: 'jost-400.woff2' },
  { family: 'Jost', weight: '500', file: 'jost-500.woff2' },
];

async function fetchGoogleFontWoff2(family, weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const res = await fetch(cssUrl, {
    headers: {
      // A modern UA is required so Google serves woff2 (format('woff2')).
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`Google Fonts CSS failed for ${family} ${weight}`);
  const css = await res.text();
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
  if (!match) throw new Error(`No woff2 URL found for ${family} ${weight}`);
  return match[1];
}

async function main() {
  await Promise.all([ensureDir(LOGO_DIR), ensureDir(IMG_DIR), ensureDir(FONT_DIR)]);

  console.log('Fetching brand imagery from the live Wix site…');
  await download(
    `https://static.wixstatic.com/media/${WIX_MEDIA.oliveTreeLogo}~mv2.jpg/v1/fill/w_1200,h_1200,al_c,q_90/file.jpg`,
    path.join(LOGO_DIR, 'olive-tree-source.jpg'),
    'Olive tree logo (source)'
  );
  await download(
    `https://static.wixstatic.com/media/${WIX_MEDIA.pierrePortrait}~mv2.jpg/v1/fill/w_1400,h_1400,al_c,q_90/file.jpg`,
    path.join(IMG_DIR, 'pierre-portrait.jpg'),
    'Pierre portrait'
  );

  console.log('\nFetching self-hosted font files (woff2)…');
  for (const { family, weight, file } of FONTS) {
    try {
      const woff2Url = await fetchGoogleFontWoff2(family, weight);
      await download(woff2Url, path.join(FONT_DIR, file), `${family} ${weight}`);
    } catch (err) {
      console.warn(`⚠ ${family} ${weight}: ${err.message} — page will fall back to system fonts.`);
    }
  }

  console.log('\nDone. Note: the hand-drawn olive-tree mark used across the site (header, favicon,');
  console.log('preloader) is a redrawn inline SVG in public/assets/logo/olive-tree.svg — the source');
  console.log('JPG above is kept only as a visual reference, not used directly in the UI.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
