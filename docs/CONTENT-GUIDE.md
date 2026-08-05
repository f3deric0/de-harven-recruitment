# Editing content

All page text lives in three files — one per language — and nowhere else:

```
src/locales/en.json   ← English (source of truth structure)
src/locales/fr.json   ← Français
src/locales/nl.json   ← Nederlands
```

Each file has the exact same structure (`site`, `nav`, `footer`, `cta`,
`pages.home`, `pages.services`, …). To change a sentence, find the matching
key in all three files and edit the text — the layout, fonts, and styling
never need to change.

After editing, rebuild:

```bash
npm run build
```

If a build fails with something like `Cannot read properties of undefined`,
a key is likely missing in one of the three locale files — the three files
must stay structurally identical (same keys, same nesting), only the text
values differ.

## Adding a new page

1. Add an entry to `PAGES` in `scripts/build.mjs` (key + URL slug).
2. Create `src/templates/<key>.html` with the page's markup.
3. Add a matching `pages.<key>` object to all three `src/locales/*.json` files.
4. Rebuild — the page is automatically added to the nav, the sitemap, and
   every language's hreflang alternates.

## Images

Drop new images into `public/assets/img/` — anything in `public/` is copied
into `dist/` as-is during the build. For photos, provide both a `.jpg` and a
`.webp` version (the templates use `<picture>` to serve WebP where supported).
