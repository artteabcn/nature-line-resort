# Cloning Guide — Boutique B&B Site Template

This repo is the canonical template for building a marketing-site-plus-booking-flow for
a small boutique B&B / guesthouse. It's currently deployed for **Pink House Koh Samui**.
This guide walks through cloning the codebase for a new property, end to end — accounts
to create, values to swap, services to wire up, and how to verify everything works.

> **Read once, then keep open during a clone.** Order matters because some steps depend
> on resources created earlier (e.g. Stripe webhook needs the production domain live).

---

## Architecture you're cloning

| Layer      | Choice                                                                  |
| ---------- | ----------------------------------------------------------------------- |
| Framework  | Next.js 15 App Router via `@opennextjs/cloudflare`                      |
| Hosting    | Cloudflare **Pages** (project deploys to `*.pages.dev` + custom domain) |
| Database   | Cloudflare D1 (SQLite at the edge)                                      |
| Media      | Cloudflare R2 (S3-compatible object storage, public bucket)             |
| Admin auth | Cloudflare Access (zero-trust, edge SSO via one-time PIN)               |
| i18n       | `next-intl`, locale subpaths `/en`, `/fr`, etc.                         |
| Styling    | Tailwind v4 + brand tokens                                              |
| Email      | Resend (transactional, both guest + owner)                              |
| Payments   | Stripe (50% non-refundable deposit, manual capture)                     |
| PMS        | Smoobu (REST API for availability + reservation create)                 |
| ORM        | Drizzle (TypeScript schema, raw migrations in `drizzle/`)               |

Public site + CMS + booking + payments all live in one Pages project. No separate backend.

---

## Per-client variables — the canonical list

Every clone touches exactly these values. Fill the right column before you start so you
have it all in one place; the rest of the guide tells you where each lands.

| Variable                            | Used in                                                                                | Example (Pink House)                               | Your value |
| ----------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- |
| **Project slug**                    | repo, `package.json`, `wrangler.toml`                                                  | `pink-house`                                       |            |
| **Property name**                   | code, content, emails                                                                  | `Pink House Koh Samui`                             |            |
| **Apex domain**                     | DNS, env, code                                                                         | `pinkhousekohsamui.com`                            |            |
| **Subdomain for media**             | DNS, R2 public host                                                                    | `media.pinkhousekohsamui.com`                      |            |
| **Default locale**                  | `src/i18n/routing.ts`                                                                  | `en`                                               |            |
| **Locales**                         | `src/i18n/routing.ts`, `messages/`                                                     | `en, fr, de, th`                                   |            |
| **Property phone (E.164)**          | `src/config/site.ts`                                                                   | `+66811065304`                                     |            |
| **Property phone (display)**        | `src/config/site.ts`, content                                                          | `+66 81 106 5304`                                  |            |
| **Public email**                    | `src/config/site.ts`, content                                                          | `hello@pinkhousekohsamui.com`                      |            |
| **Property coordinates (lat, lng)** | `src/config/site.ts`                                                                   | `9.4740216, 100.0541465`                           |            |
| **Property address**                | `src/config/site.ts`                                                                   | `Lamai, Koh Samui, 84310, TH`                      |            |
| **Brand primary** (Tailwind)        | Tailwind config / `globals.css`                                                        | `#dc4080` (pink)                                   |            |
| **Brand secondary** (Tailwind)      | Tailwind config / `globals.css`                                                        | `#0f7b6e` (teal)                                   |            |
| **Brand background**                | Tailwind config / `globals.css`                                                        | `#fff7ed` (cream)                                  |            |
| **Heading font**                    | `src/app/[locale]/layout.tsx`                                                          | `Cormorant Garamond`                               |            |
| **Body font**                       | `src/app/[locale]/layout.tsx`                                                          | `Outfit`                                           |            |
| **Display/script font**             | `src/app/[locale]/layout.tsx`                                                          | `Yellowtail`                                       |            |
| **Editor emails (CMS)**             | Cloudflare Access policy                                                               | `greg@…`, `bradley@…`, `pinkhouse.lamai@gmail.com` |            |
| **Owner alert email**               | `OWNER_EMAIL` env                                                                      | `hello@pinkhousekohsamui.com`                      |            |
| **Resend from-address**             | `RESEND_FROM` env                                                                      | `noreply@pinkhousekohsamui.com`                    |            |
| **Smoobu API key**                  | `SMOOBU_API_KEY` env                                                                   | Smoobu → Settings → API                            |            |
| **Smoobu apartment IDs**            | `src/config/smoobu.ts`                                                                 | `[3040751, …]`                                     |            |
| **Smoobu channel ID (direct)**      | `src/config/smoobu.ts`                                                                 | `5722806`                                          |            |
| **Stripe account region**           | Stripe Dashboard                                                                       | Thailand (THB-enabled)                             |            |
| **Stripe keys** (live or test)      | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` env | `sk_live_…`, `pk_live_…`, `whsec_…`                |            |
| **Currency code (3-letter)**        | hardcoded in payment-intent route                                                      | `thb`                                              |            |
| **Deposit percentage**              | `src/config/payments.ts`                                                               | `50`                                               |            |
| **Cloudflare account ID**           | `.env.local`, deploy scripts                                                           | `a28e85c8…`                                        |            |
| **D1 database name**                | `wrangler.toml`                                                                        | `pinkhouse`                                        |            |
| **D1 database ID**                  | `wrangler.toml`                                                                        | UUID from CF                                       |            |
| **R2 bucket name**                  | `wrangler.toml`                                                                        | `pinkhouse-media`                                  |            |
| **`MEDIA_PUBLIC_URL`**              | env                                                                                    | `https://media.pinkhousekohsamui.com`              |            |
| **`CF_ACCESS_TEAM_DOMAIN`**         | env                                                                                    | `artteabcn`                                        |            |
| **`CF_ACCESS_AUD`**                 | env (per-Access-app)                                                                   | 64-hex                                             |            |

---

## Prerequisites — accounts ready before you start

You can spin most of these up during the clone, but pre-creating them saves friction.

- **GitHub** — repo will live under your org / personal account
- **Cloudflare** — one CF account can host many B&B sites; create or reuse. Confirm:
  - R2 is enabled (one-time activation in the dashboard, free tier)
  - Zero Trust / Access is enabled (free for ≤ 50 users)
- **Resend** — single account can serve many domains; verify the per-client domain
- **Stripe** — **one Stripe account per client** is the right move. The owner of the
  property is the legal recipient of funds, not you. Have them complete onboarding
  (KYC, bank details). Connect-platform setup is out of scope for this template.
- **Smoobu** — one Smoobu account per property; subscription typically paid by the owner.
  Get API access enabled (Smoobu → Settings → API).
- **Domain registrar** — register the domain and ensure DNS points at Cloudflare
  (nameservers at the registrar must be the CF nameservers Cloudflare shows you when
  you add the site).

---

## Step 1 — Domain & DNS

1. Register the apex domain at any registrar (Namecheap, Porkbun, Cloudflare Registrar
   are all fine).
2. In Cloudflare Dashboard → **Websites → Add a Site** → enter the apex domain → Free plan.
3. Cloudflare gives you two nameservers. Update them at the registrar. Propagation: minutes
   to a few hours. CF emails you when it's done.
4. **Don't add A/CNAME records yet** — Pages will configure these automatically when you
   attach a custom domain later in Step 6.

---

## Step 2 — GitHub repo

```bash
# clone this template
git clone https://github.com/artteabcn/PinkHouse.git <new-project>
cd <new-project>

# disconnect from the template, point at the new client repo
rm -rf .git
git init
git add -A
git commit -m "feat: initial commit from PinkHouse template"
# create the GitHub repo (gh CLI shown; web UI also fine)
gh repo create <org>/<new-project> --private --source=. --push
```

Find-and-replace pass (review each match before saving):

```bash
# project slug → use a unique name without spaces
grep -rIn "pinkhouse\|pink-house\|Pink House\|PinkHouse" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.open-next \
  --exclude-dir=drizzle --exclude=CLONING.md .
```

Update these in order:

- `package.json` → `"name"`
- `wrangler.toml` → `name`, `database_name`, `database_id` (placeholder — fill after Step 3),
  `bucket_name`
- `src/config/site.ts` → `SITE_URL`, `email`, `phone`, `address`, `geo`, `name`, `shortName`
- `src/config/smoobu.ts` → leave for Step 7 (Smoobu)
- `messages/{en,fr,de,th}.json` → site copy (or do during /content editing post-launch)
- `src/components/SocialIcons.tsx` → `SOCIAL_LINKS` (Facebook + Instagram URLs)

---

## Step 3 — Cloudflare core: Pages project + D1 + R2

```bash
# log in once
npx wrangler login
```

### 3a. Create the D1 database

```bash
npx wrangler d1 create <project-slug>
```

Copy the `database_id` from the output. Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "<project-slug>"
database_id = "<the UUID>"
migrations_dir = "drizzle"
```

Apply migrations to the new (empty) DB:

```bash
$env:CLOUDFLARE_ACCOUNT_ID="<your-account-id>"   # PowerShell; bash uses export
pnpm db:migrate                                  # alias for wrangler d1 migrations apply --remote
```

### 3b. Create the R2 bucket

```bash
npx wrangler r2 bucket create <project-slug>-media
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "<project-slug>-media"
```

In the dashboard → **R2 → `<project-slug>-media` → Settings**:

- Either click **Allow Access** under "Public Development URL" (gives you a `pub-xxx.r2.dev`
  URL — fine for staging) OR
- **Connect Domain** → add `media.<apex>` and let CF auto-create the DNS record
  (recommended for production — branded URL, same TLS cert as the main site).

Copy the resulting URL (with `https://`) — it becomes `MEDIA_PUBLIC_URL` later.

### 3c. Create the Cloudflare Pages project

Two options. Pick one and stick with it.

**Option A — Manual deploy (this template's current pattern):**

```bash
pnpm install
pnpm run build:cf
# on Windows, finish the post-build steps that the script can't do via `mv`/`cp`:
# Move-Item .open-next\worker.js .open-next\_worker.js
# Copy-Item -Recurse -Force .open-next\assets\* .open-next\
# (then write _routes.json — see the package.json script for the exact command)
npx wrangler pages deploy .open-next --project-name <project-slug>
```

The first deploy auto-creates the Pages project.

**Option B — Git-integrated deploy (cleaner, recommended for clients):**

In the dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the
GitHub repo. Configure:

- Build command: `pnpm run build:cf` (note: the `mv`/`cp` post-step in this script
  uses Unix syntax — fine on CF's Linux build runners, would break on a Windows dev box)
- Build output directory: `.open-next`
- Root directory: `/`
- Environment variables: set per Step 9

Pages will deploy on every push to `main` and create preview deploys for PRs.

---

## Step 4 — Cloudflare Email Routing (forwarding)

So `hello@<apex>` lands somewhere the owner reads (typically Gmail), without running a
mail server.

Dashboard → **Email → Email Routing → Enable**. CF auto-adds the MX records. Then:

- **Routing rule:** custom address `hello@<apex>` → forward to `<owner-gmail>`
- (Optional) add a catch-all: `*@<apex>` → forward to the same Gmail
- Verify the destination address (CF sends a verification link to it)

This is independent of Resend — Resend sends outbound mail; Email Routing receives inbound.

---

## Step 5 — Resend (outbound transactional email)

1. Sign up at https://resend.com
2. **Domains → Add Domain** → enter the apex
3. Resend gives you 3–4 DNS records (SPF TXT, DKIM CNAMEs, return-path). Add them in
   Cloudflare DNS for the apex. Wait for Resend's auto-verification (minutes to ~1 hour).
4. **API Keys → Create** → copy the `re_…` key → save for env vars.
5. Decide the from-address (e.g. `noreply@<apex>`) — Email Routing doesn't need a
   matching inbound rule; outbound just needs DNS verification.

> **Domain mismatch is the #1 launch bug.** Make sure `RESEND_FROM` and `OWNER_FROM_EMAIL`
> are both on the **verified** domain. Resend 403s anything else.

---

## Step 6 — Cloudflare Pages: attach custom domain + env vars

Pages dashboard → your project → **Custom domains → Set up a custom domain** → `<apex>`
and `www.<apex>`. CF auto-creates the CNAME records. SSL provisions in a few minutes.

Then **Settings → Environment variables → Production** — add everything from Step 9 below.

---

## Step 7 — Smoobu (PMS)

1. Owner creates a Smoobu account, adds the property (apartments / room types).
2. Smoobu → **Settings → API** → enable API access, copy the API key.
3. Get the apartment IDs:

   ```bash
   curl -H "Api-Key: <key>" https://login.smoobu.com/api/apartments
   ```

   The response includes an `apartments` array with `id` per unit. Copy the IDs.

4. Get the direct-website channel ID (one per Smoobu account):

   ```bash
   curl -H "Api-Key: <key>" https://login.smoobu.com/api/channels
   ```

   Look for the channel named "Direct booking" or similar; copy its `id`.

5. Update `src/config/smoobu.ts`:

   ```ts
   export const SMOOBU_CHANNEL_ID_DIRECT_WEBSITE = <channel-id>;
   export const SMOOBU_APARTMENT_IDS = [<id1>, <id2>, ...] as const;

   // Map each apartment ID to a room type. If all units are one type,
   // map them all to "standard". Otherwise define more room types and
   // match them up.
   export const APARTMENT_TO_ROOM_ID: Record<number, string> = Object.fromEntries(
     SMOOBU_APARTMENT_IDS.map((id) => [id, "standard"])
   );

   // Default apartment for a roomId → used when the booking flow needs a
   // fallback. Pick any reasonable id.
   export const ROOM_TO_APARTMENT_ID: Record<string, number> = {
     standard: SMOOBU_APARTMENT_IDS[0],
   };
   ```

6. If you add a new room type, also add a matching entry in
   `messages/*.json` under `rooms.items` (id must match the roomId).

---

## Step 8 — Stripe

1. Owner registers at https://stripe.com — pick the country where they'll receive funds.
   This determines the supported currencies.
2. Complete KYC + bank details.
3. **Dashboard → Developers → API keys** → copy publishable + secret keys.
   Use **test mode** keys (`pk_test_…`, `sk_test_…`) for staging; switch to live for prod.
4. **Webhooks → Add endpoint:**
   - URL: `https://<apex>/api/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.canceled`,
     `payment_intent.payment_failed`, `charge.refunded`
   - Copy the signing secret (`whsec_…`).
5. Currency: this template hardcodes `currency: "thb"` in
   `src/app/api/payment-intent/route.ts`. Change it to match the property's country
   (3-letter ISO code, lowercase).
6. Deposit split: `src/config/payments.ts` → `DEPOSIT_PERCENT`. Default 50. Change if
   the owner prefers e.g. 30 or 100.

---

## Step 9 — Environment variables (Cloudflare Pages)

Set all of these in Pages → Settings → Environment variables → **Production**. Some are
also needed in Preview if you use git-integrated previews; copy the same values there.

```dotenv
# Resend
RESEND_API_KEY=re_...
RESEND_FROM=noreply@<apex>
OWNER_EMAIL=<owner-inbox>
OWNER_FROM_EMAIL=noreply@<apex>

# Smoobu
SMOOBU_API_KEY=...

# Drizzle remote migrations (also useful in CI)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_D1_DATABASE_ID=...
CLOUDFLARE_API_TOKEN=...

# Stripe (live vs test must match between secret + publishable)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# CMS
MEDIA_PUBLIC_URL=https://media.<apex>
CF_ACCESS_TEAM_DOMAIN=<team-subdomain>     # from artteabcn.cloudflareaccess.com
CF_ACCESS_AUD=<aud-from-access-app>        # filled in Step 10
```

> `NEXT_PUBLIC_*` variables are **baked into the client bundle at build time**, not read
> at runtime. With manual `wrangler pages deploy` builds, the value must be in the local
> env of whoever runs the build. With git-integrated builds, CF reads the dashboard env
> at build time (this is the easier path).

---

## Step 10 — Cloudflare Access (CMS auth)

This is what makes `/content` accessible only to specific editor emails.

1. Dashboard → **Zero Trust → Access → Applications → Add → Self-hosted**.
2. Application name: `<Property> CMS` (e.g. "Pink House CMS").
3. Session duration: 24 hours.
4. **Application domains** — add **three** rows:
   - `<apex>` `/content`
   - `<apex>` `/content/*`
   - `<apex>` `/api/admin/*`
5. **Identity providers:** keep One-time PIN enabled (CF sends a 6-digit code by email).
6. **Policies → Add:**
   - Name: `Editors`
   - Action: **Allow**
   - Configure rule → Include → **Emails** → list the editor emails.
7. Save.
8. On the application row → **Edit** → copy the **Application Audience (AUD) Tag**.
9. Note your team domain — visible in the URL when logged into Zero Trust
   (`<team>.cloudflareaccess.com`). Just the `<team>` subdomain.
10. Back to Pages env (Step 9): set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`.

Test: hit `https://<apex>/content` in an incognito window. CF Access should prompt for
your email → send a PIN → on success, you land on the CMS dashboard.

---

## Step 11 — Brand customization

Things to update so the site doesn't look like Pink House.

### 11a. Colors

The brand palette lives in `src/app/globals.css` (Tailwind v4 `@theme` directive). Adjust:

- `--color-brand-pink` (primary) — change to the new primary accent
- `--color-brand-teal` (secondary) — change to the new secondary accent
- `--color-brand-cream` (page background)
- All the `*-light` / `*-dark` shades to match

Search `brand-pink` across the codebase — every reference uses the Tailwind tokens, so
changing the CSS variable cascades to the whole site.

### 11b. Fonts

`src/app/[locale]/layout.tsx` imports Google Fonts via a `<link>` in `<head>`. Swap the
three font families (heading serif, body sans, display script). Update Tailwind theme
to point at the new families.

`src/app/content/layout.tsx` separately loads Outfit for the admin UI — change if you
want the CMS to also use the new brand font.

### 11c. Logo + images

Replace `public/logo.png` with the new logo. Replace the photos in `public/images/`
(`main.jpeg`, `main2.jpeg`, `main3.jpeg`, `main4.jpeg`, `room.jpeg`) with property photos
of the same names — the `IMAGE_SLOTS` fallbacks reference these filenames.

For ongoing edits, use the CMS `/content/media` page instead. The shipped defaults only
matter before the owner uploads overrides.

### 11d. Content

Two paths:

- **Pre-launch:** edit `messages/{en,fr,de,th}.json` directly. Faster, but every change
  is a commit + deploy.
- **Post-launch:** use `/content/text` and `/content/rooms`. Saved to D1, no deploy.

The CMS lets the property owner do edits themselves. Use direct JSON edits for the initial
content pass during cloning, then hand over the CMS for ongoing updates.

### 11e. SEO

- `src/config/site.ts` → already covered in Step 2's find-and-replace
- `messages/*.json` → `seo.*` keys per locale (title, description, keywords)
- `public/favicon.ico` and `src/app/icon.svg` → swap for the new brand mark

---

## Step 12 — Deploy + verify

After all envs are set and Step 10 is complete:

```bash
# build + deploy (manual)
pnpm run build:cf
npx wrangler pages deploy .open-next --project-name <project-slug>

# OR (git-integrated) just:
git push origin main
```

### Smoke-test checklist

Run through each, in order, before considering the clone complete:

- [ ] Public site loads at `https://<apex>` and all locales (`/en`, `/fr`, …) render
- [ ] Homepage hero, room card, and gallery show the expected photos
- [ ] `/api/health` returns `{ok: true}`
- [ ] `/api/availability` returns rooms for a date range 30+ days out
- [ ] Contact form (homepage) submits → owner receives email + sender receives reply
- [ ] **Stripe in test mode**: book a 1-night stay, pay with `4242 4242 4242 4242`,
      confirm:
  - Smoobu shows the reservation
  - Stripe dashboard shows a `Succeeded` capture for the deposit only
  - Guest receives the localized booking confirmation
  - Owner receives the booking alert
- [ ] `/content` in incognito → CF Access prompts → after PIN, dashboard loads
- [ ] `/content/text` → edit a hero string → save → reload homepage → change visible
- [ ] `/content/media` → upload a new logo → reload → new logo in Nav + Footer
- [ ] Switch Stripe to live keys, redeploy, do one real booking + immediate refund
      via Stripe Dashboard to confirm production card processing works

---

## Step 13 — Handover

What you give the owner:

1. **CMS access** — the editor emails you added in Step 10. Show them
   `https://<apex>/content`, walk through editing one text field and uploading one image.
2. **Smoobu** — they already have this, but verify they can see direct-channel bookings
   come through with status "confirmed" and price-paid populated (Smoobu shows our API
   bookings under their direct-channel reservations).
3. **Stripe Dashboard** — they own this account. Show them how to issue refunds, view
   payouts, view test vs live mode.
4. **Resend** — usually not handed over; you keep the API key. Owner doesn't need access.
5. **Cloudflare Access PIN flow** — explain they'll get a 6-digit code by email every
   24 hours (session duration). They paste it on the CF Access prompt.

What you keep (do not hand over):

- Cloudflare account (you operate)
- Resend account (you operate)
- GitHub repo (you operate; future code changes flow through PRs)
- Stripe webhook secret (it's an integration credential, not the owner's funds)

---

## Appendix A — Adding/removing locales

1. `src/i18n/routing.ts` → update the `locales` array
2. Create `messages/<new-locale>.json` (copy from `en.json` and translate)
3. `src/i18n/request.ts` → import the new file and add to `allMessages`
4. `src/lib/guest-email.ts` → import the new file and add to the `messages` map
5. `src/app/content/text/page.tsx` + `rooms/page.tsx` → add to `LOCALES` + `BASE`
6. `src/app/sitemap.ts` already reads from `routing.locales` — no change needed

---

## Appendix B — Changing the payment model

- **Deposit %**: `src/config/payments.ts` → `DEPOSIT_PERCENT`. Used by both the API
  routes and the BookingForm UI.
- **Full prepayment**: set `DEPOSIT_PERCENT = 100`. Copy in `messages/*.json` still says
  "non-refundable deposit" — search `nonRefundable` and adjust per locale, plus update
  the acknowledgement checkbox copy.
- **Authorization-only (no capture until arrival)**: remove the `capturePaymentIntent`
  call in `src/app/api/booking/route.ts` and instead store the intent ID; capture later
  via a manual admin tool or a scheduled job. Note: Stripe holds expire after 7 days,
  so this only works for bookings within a week.

---

## Appendix C — File map (what changes per client vs what doesn't)

**Per-client (touch every clone):**

```
package.json                            # name
wrangler.toml                           # name, db_id, db_name, bucket_name
src/config/site.ts                      # URL, email, phone, address, geo, name
src/config/smoobu.ts                    # apartment IDs, channel ID
src/config/payments.ts                  # deposit % (sometimes)
src/app/globals.css                     # brand color tokens
src/app/[locale]/layout.tsx             # font families
messages/{en,fr,de,th}.json             # all content strings
public/logo.png + public/images/*       # photos
src/components/SocialIcons.tsx          # social URLs
```

**Infrastructure boilerplate (almost never changes):**

```
src/app/api/*                           # booking, availability, contact, stripe, admin
src/app/content/*                       # CMS dashboard
src/lib/*                               # smoobu, stripe, resend, content, admin-auth
src/i18n/*                              # routing + request handler
src/db/schema.ts                        # bookings, contacts, content tables
src/middleware.ts                       # next-intl middleware
drizzle/*                               # migrations (run once per clone)
src/components/BookingForm.tsx          # booking flow UI
src/components/{Nav,Footer,Hero,...}    # marketing components
```

---

## Appendix D — Common gotchas

- **`MEDIA_PUBLIC_URL` without `https://`** — protocol-relative URLs work in browsers but
  break in emails and OG images. Always include the scheme.
- **CF Access app missing `/content/*` and `/api/admin/*`** — `/content` alone won't
  cover subpages. Add all three patterns.
- **Stripe live vs test mismatch** — `pk_live_…` + `sk_test_…` produces "Invalid API
  Key" at confirm time. Both have to be the same mode.
- **Resend domain not verified** — sends fail with 403 "domain not verified". Wait for
  DNS to propagate fully before going live.
- **OpenNext + pnpm + Windows symlinks** — if you build locally on Windows and hit
  "Access is denied" on `react`/`styled-jsx` paths during the OpenNext bundle step,
  it's the pnpm symlink layout. `.npmrc` with `node-linker=hoisted` resolves it (already
  in this repo).
- **`build:cf` script uses `mv`/`cp`** — Unix-only. On Windows, run the build step and
  do the post-rename manually (or switch to git-integrated deploys so CF's Linux runners
  handle it).
- **Smoobu shows `available: 0` for all units on near-term dates** — means the owner
  hasn't published availability for the near term, or has a "minimum advance notice"
  rule set in Smoobu. Not a code bug. Send them to their Smoobu calendar.

---

That's it. With this guide and ~half a day of focused work, you should be able to spin
up a new client site that's structurally identical to Pink House, with their brand,
domain, content, payments, and CMS.
