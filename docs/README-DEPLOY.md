# de Harven Recruitment — Deployment & Operations

## Local development

```bash
npm run build     # renders src/ + public/ into dist/
npm run serve     # serves dist/ on http://localhost:3000
npm run dev       # build + serve in one step
```

The site is fully static (HTML/CSS/JS) except for one serverless function,
`api/contact.js`, which only runs on Vercel. To test that function locally
you need the Vercel CLI: `vercel dev`.

## How the site is built

`scripts/build.mjs` reads:
- `src/templates/*.html` — one `_layout.html` shell + one template per page
- `src/locales/{en,fr,nl}.json` — all page copy, one file per language

and renders every page × language combination into `dist/<lang>/<page>/index.html`
(clean URLs, no `.html` in the address bar). CSS and JS are bundled and
content-hashed into `dist/assets/`. Nothing in `dist/` should be hand-edited —
it's regenerated on every build and is gitignored.

## Enabling real email delivery

Out of the box, the contact form and newsletter sign-up work with **zero
configuration**: submissions that can't be emailed automatically fall back to
opening the visitor's email client with a pre-filled message. To switch on
real email delivery via [Resend](https://resend.com) (free tier: 3,000
emails/month, no credit card):

1. Create a Resend account and an API key.
2. In the Vercel project → **Settings → Environment Variables**, add:
   - `RESEND_API_KEY` — the key from Resend
   - `CONTACT_TO_EMAIL` — optional, defaults to `deharvenpierre@gmail.com`
   - `RESEND_FROM` — optional, defaults to Resend's shared sandbox sender
     (`onboarding@resend.dev`), which works immediately with no setup.
     Once a domain is verified in Resend (e.g. `mail.de-harven-recruitment.com`),
     set this to a real address on that domain for better deliverability.
3. Redeploy (or just push — env var changes apply on the next deploy).

With `RESEND_API_KEY` set, `api/contact.js`:
- emails every contact-form submission to `CONTACT_TO_EMAIL`, reply-to set to
  the visitor's address;
- sends the visitor a short confirmation email;
- emails a one-line notification to `CONTACT_TO_EMAIL` for newsletter sign-ups
  (no auto-reply is sent to subscribers — there's no real mailing list
  behind this yet, so promising one would be misleading).

## Connecting the custom domain

Once `de-harven-recruitment.com` is ready to point here: Vercel project →
**Settings → Domains** → add the domain and follow the DNS instructions shown
there (either an A/ALIAS record at the registrar, or delegate nameservers to
Vercel). After the domain is verified, update `SITE_URL` (see below) and
redeploy so canonical URLs, hreflang tags, and the sitemap use the real domain.

## Environment variables reference

| Variable | Required | Purpose |
|---|---|---|
| `SITE_URL` | No | Base URL used for canonical links, hreflang, sitemap, and OG tags. Defaults to the Vercel preview URL; set to `https://de-harven-recruitment.com` once the domain is live. |
| `RESEND_API_KEY` | No | Enables real email sending. Without it, forms fall back to `mailto:`. |
| `CONTACT_TO_EMAIL` | No | Where enquiries land. Defaults to `deharvenpierre@gmail.com`. |
| `RESEND_FROM` | No | Sender address for outgoing email. |

## Known follow-ups (flagged, not blocking launch)

- **Privacy Policy / Terms** (`/privacy/`, `/terms/`): factual, plain-language
  pages describing exactly how this site's form and newsletter handle data.
  They are accurate to how the code actually works, but are not a substitute
  for a lawyer's review — recommended before relying on them for compliance
  in a specific jurisdiction.
- **Dutch (NL) content**: included because the founder's Belgian client base
  likely includes Flemish speakers, but this should be confirmed — if enquiries
  in Dutch can't be handled personally, consider removing the `/nl/` locale
  or adding a note that responses may be in French/English.
- **Newsletter**: currently a lightweight notify-Pierre mechanism, not a real
  mailing list. If regular newsletters are wanted, wire the sign-up into a
  proper ESP (Resend Broadcasts, Mailchimp, etc.) instead.
