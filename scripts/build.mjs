#!/usr/bin/env node
/**
 * Static-site build for de Harven Recruitment.
 *
 * Reads src/templates/*.html + src/locales/{en,fr,nl}.json, renders every
 * page in every locale via scripts/lib/template.mjs, bundles CSS/JS with
 * content-hashed filenames, copies public/ assets, and emits sitemap.xml
 * + a language-detecting root index.html.
 *
 * Output: dist/  (gitignored, regenerated on every build)
 */
import { readFile, writeFile, mkdir, readdir, cp, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { render } from './lib/template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const SITE_URL = (process.env.SITE_URL || 'https://de-harven-recruitment.vercel.app').replace(/\/$/, '');

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'nl', label: 'NL' }
];
const DEFAULT_LANG = 'en';

const PAGES = [
  { key: 'home', slug: '' },
  { key: 'services', slug: 'services' },
  { key: 'methodology', slug: 'methodology' },
  { key: 'industries', slug: 'industries' },
  { key: 'about', slug: 'about' },
  { key: 'contact', slug: 'contact' }
];

// Footer-only pages: rendered and localized like any other page, but not
// part of the primary nav (buildNavItems only walks PAGES above).
const LEGAL_PAGES = [
  { key: 'privacy', slug: 'privacy' },
  { key: 'terms', slug: 'terms' }
];

const ALL_PAGES = PAGES.concat(LEGAL_PAGES);

function urlFor(lang, slug) {
  return slug ? `/${lang}/${slug}/` : `/${lang}/`;
}

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

/* --- very small, safe CSS minifier: strip comments + collapse whitespace --- */
function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

async function buildCssBundle() {
  const order = ['tokens.css', 'fonts.css', 'base.css', 'layout.css', 'components.css', 'motion.css', 'pages.css'];
  let combined = '';
  for (const file of order) {
    combined += `\n/* --- ${file} --- */\n` + (await readFile(path.join(SRC, 'styles', file), 'utf8'));
  }
  const minified = minifyCss(combined);
  const hash = hashContent(minified);
  const outDir = path.join(DIST, 'assets', 'css');
  await ensureDir(outDir);
  const filename = `main.${hash}.css`;
  await writeFile(path.join(outDir, filename), minified, 'utf8');
  return `/assets/css/${filename}`;
}

async function buildJsBundle() {
  const dir = path.join(SRC, 'scripts');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.js')).sort();
  let combined = '(function () {\n"use strict";\n';
  for (const file of files) {
    combined += `\n/* --- ${file} --- */\n` + (await readFile(path.join(dir, file), 'utf8'));
  }
  combined += '\n})();\n';
  const hash = hashContent(combined);
  const outDir = path.join(DIST, 'assets', 'js');
  await ensureDir(outDir);
  const filename = `main.${hash}.js`;
  await writeFile(path.join(outDir, filename), combined, 'utf8');
  return `/assets/js/${filename}`;
}

async function copyPublic() {
  await cp(PUBLIC, DIST, { recursive: true });
}

function buildNavItems(locale, lang, currentKey) {
  return PAGES.map((p) => ({
    label: locale.nav[p.key],
    href: urlFor(lang, p.slug),
    active: p.key === currentKey
  }));
}

function buildLangLinks(lang, currentKey) {
  const page = ALL_PAGES.find((p) => p.key === currentKey);
  return LANGS.map((l) => ({
    code: l.code,
    label: l.label,
    href: urlFor(l.code, page.slug),
    active: l.code === lang
  }));
}

function buildAlternates(currentKey) {
  const page = ALL_PAGES.find((p) => p.key === currentKey);
  const alternates = LANGS.map((l) => ({ hreflang: l.code, url: `${SITE_URL}${urlFor(l.code, page.slug)}` }));
  alternates.push({ hreflang: 'x-default', url: `${SITE_URL}${urlFor(DEFAULT_LANG, page.slug)}` });
  return alternates;
}

async function main() {
  console.log('▸ Cleaning dist/…');
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await ensureDir(DIST);

  console.log('▸ Copying public/ assets…');
  await copyPublic();

  console.log('▸ Bundling CSS…');
  const cssHref = await buildCssBundle();
  console.log('▸ Bundling JS…');
  const jsHref = await buildJsBundle();

  console.log('▸ Loading templates…');
  const layoutSrc = await readFile(path.join(SRC, 'templates', '_layout.html'), 'utf8');
  const pageTemplates = {};
  for (const p of ALL_PAGES) {
    pageTemplates[p.key] = await readFile(path.join(SRC, 'templates', `${p.key}.html`), 'utf8');
  }

  console.log('▸ Loading locales…');
  const locales = {};
  for (const l of LANGS) {
    locales[l.code] = await readJson(path.join(SRC, 'locales', `${l.code}.json`));
  }

  const sitemapUrls = [];
  let pageCount = 0;

  for (const l of LANGS) {
    const locale = locales[l.code];

    // urls: every page's localized URL, for internal links inside content.
    const urls = {};
    for (const p of ALL_PAGES) urls[p.key] = urlFor(l.code, p.slug);

    for (const p of ALL_PAGES) {
      const pageData = JSON.parse(JSON.stringify(locale.pages[p.key])); // deep clone, safe to mutate

      // Resolve internal cross-links declared as page keys (e.g. home's service
      // summary cards reference "services" / "methodology" / "industries").
      if (p.key === 'home' && Array.isArray(pageData.services)) {
        pageData.services = pageData.services.map((s) => ({ ...s, url: urls[s.href] || '#' }));
      }

      const navItems = buildNavItems(locale, l.code, p.key);
      const langLinks = buildLangLinks(l.code, p.key);
      const alternates = buildAlternates(p.key);
      const canonicalUrl = `${SITE_URL}${urls[p.key]}`;

      const baseContext = {
        site: locale.site,
        nav: locale.nav,
        footer: locale.footer,
        cta: locale.cta,
        langSwitch: locale.langSwitch,
        meta: locale.meta,
        page: pageData,
        pageKey: p.key,
        urls,
        year: String(new Date().getFullYear())
      };

      const contentHtml = render(pageTemplates[p.key], baseContext);

      const layoutContext = {
        ...baseContext,
        navItems,
        langLinks,
        alternates,
        canonicalUrl,
        cssHref,
        jsHref,
        siteUrl: SITE_URL,
        content: contentHtml
      };

      const fullHtml = render(layoutSrc, layoutContext);

      const outDir = path.join(DIST, l.code, p.slug);
      await ensureDir(outDir);
      await writeFile(path.join(outDir, 'index.html'), fullHtml, 'utf8');
      pageCount++;

      sitemapUrls.push({ loc: canonicalUrl, alternates });
    }
  }

  console.log(`▸ Rendered ${pageCount} pages across ${LANGS.length} locales.`);

  console.log('▸ Writing sitemap.xml…');
  const sitemapXml = buildSitemap(sitemapUrls);
  await writeFile(path.join(DIST, 'sitemap.xml'), sitemapXml, 'utf8');

  console.log('▸ Writing root redirector index.html…');
  await writeFile(path.join(DIST, 'index.html'), buildRootRedirect(), 'utf8');

  console.log('✓ Build complete → dist/');
}

function buildSitemap(entries) {
  const urlsXml = entries
    .map((e) => {
      const alt = e.alternates
        .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.url}" />`)
        .join('\n');
      return `  <url>\n    <loc>${e.loc}</loc>\n${alt}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlsXml}\n</urlset>\n`;
}

function buildRootRedirect() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=/en/">
<link rel="canonical" href="${SITE_URL}/en/">
<title>de Harven Recruitment</title>
<script>
(function () {
  var supported = ${JSON.stringify(LANGS.map((l) => l.code))};
  var browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  var target = supported.indexOf(browserLang) !== -1 ? browserLang : 'en';
  window.location.replace('/' + target + '/');
})();
</script>
</head>
<body>
<p>Redirecting to <a href="/en/">de Harven Recruitment</a>…</p>
</body>
</html>
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
