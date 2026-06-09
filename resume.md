# Nature Line Resort — Project Resume

Last updated: 2026-05-11 (v2)

A boutique B&B website for Nature Line Resort (Khanom). Marketing site

- native Smoobu booking flow on Cloudflare Pages.

---

## Stack snapshot

| Layer     | Choice                                                                |
| --------- | --------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router) via `@opennextjs/cloudflare`                  |
| Hosting   | Cloudflare **Pages** (D1 binding `DB`) — see Gotchas                  |
| i18n      | `next-intl` — locales: en (default), fr, de, th                       |
| Styling   | Tailwind v4 + brand tokens (see `CLAUDE.md`)                          |
| Forms     | React Hook Form + Zod                                                 |
| ORM       | Drizzle + D1                                                          |
| Booking   | Smoobu REST API (channel 0, 6× `standard` units)                |
| Email     | Resend (guest confirmations + owner alerts, single provider)          |
| Phone     | `PLACEHOLDER_PHONE_DISPLAY` — sourced from `SITE.phone` in `src/config/site.ts` |

---

## What's built

**Marketing site (homepage `/[locale]`):**
Hero, About, Rooms, Amenities, Testimonials, Gallery, Contact (form +
map + WhatsApp + colorized FB/IG CTAs), minimalist Footer (logo + 2
social icons). Section padding tightened to `py-20`.

**Booking flow (`/[locale]/book`):**
4-step BookingForm: search → results → guest details → **Stripe payment** →
success. Charge model: **50% non-refundable deposit** in THB; balance
payable on arrival. `DEPOSIT_PERCENT` constant in
`src/config/payments.ts` is the single source of truth. Pipeline:
`/api/availability` (Smoobu `/rates`) → `/api/payment-intent` (re-prices
via Smoobu, inserts pending D1 row, creates manual-capture Stripe
`PaymentIntent` for the **deposit only**) → `<PaymentElement>` with
non-refundable acknowledgement checkbox + total/deposit/balance breakdown
→ `confirmPayment` (intent → `requires_capture`) → `/api/booking`
(verifies intent, creates Smoobu reservation with full stay price,
**captures** the deposit, marks D1 `paid`/`confirmed`, fires owner +
guest emails listing total / deposit paid / balance due). Stripe webhook
at `/api/stripe/webhook` defensively syncs D1 on
`payment_intent.succeeded|canceled|payment_failed` and `charge.refunded`.
On Smoobu failure the intent is **canceled** so the guest is never charged.

**SEO (added 2026-05-06):**

- `src/config/site.ts` — central URL/geo/address/social/phone config.
- Per-locale `generateMetadata` on `/` and `/book`: localized title,
  description, canonical, hreflang alternates (4 locales + `x-default`),
  OpenGraph, Twitter card.
- `LodgingBusiness` JSON-LD on homepage (address, geo, telephone,
  sameAs, amenities, available languages).
- `src/app/robots.ts` + `src/app/sitemap.ts` (4 locales × all routes).
- Root layout: `metadataBase`, `themeColor: #1a6b8a`, icons, robots
  defaults.
- `seo.*` keys in all four `messages/*.json`.

---

## Open / pending

- **Smoobu calendar diagnosis (2026-05-11)** — investigating reports of
  "no rooms available" near-term turned out to be a Smoobu data issue,
  not a code bug. Smoobu's `/rates` endpoint returns `available: 0` for
  all 6 apartments on near-term dates (with prices + `min_length_of_stay: 2`
  set). Likely causes: (a) calendar not yet published for near-term;
  (b) a "minimum advance notice" / booking cut-off rule set in Smoobu;
  (c) channel sync blocking dates from Booking.com / Agoda. Action:
  open Smoobu → Calendar and confirm near-term availability is published
  for direct channel.
- **Min-stay UX gap** — Smoobu enforces `min_length_of_stay: 2`. The
  current date picker accepts 1-night searches which then return zero
  rooms with no explanation. Either enforce a 2-night minimum in the
  picker or surface an explicit "minimum 2 nights" message when results
  are empty.
- **Stripe go-live checklist** (integration shipped 2026-05-09, switched
  to 50% non-refundable deposit on 2026-05-11):
  - Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
    `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Cloudflare Pages → Env Vars
    (production) and `.env.local` (dev).
  - Apply migration `drizzle/0002_amused_professor_monster.sql` to remote
    D1 (`pnpm db:migrate`).
  - Confirm the Stripe account is provisioned for THB charges (Thailand
    region or multi-currency-enabled).
  - Register webhook in Stripe Dashboard pointing to
    `https://nature-line-resortkhanom.com/api/stripe/webhook` for events
    `payment_intent.succeeded`, `payment_intent.canceled`,
    `payment_intent.payment_failed`, `charge.refunded`. Copy the signing
    secret into `STRIPE_WEBHOOK_SECRET`.
  - Smoobu reservations created via the API are not flagged paid in
    Smoobu's UI — consider patching `price-paid` on the reservation
    after capture so the owner's Smoobu dashboard reflects payment
    status. (Smoobu API: `PUT /reservations/{id}` with `price-paid`.)
- **Refund flow** — currently manual via Stripe Dashboard. Build an
  owner-side endpoint or admin page if refunds become routine.
  Webhook already syncs D1 to `paymentStatus: "refunded"` whenever a
  charge is refunded.
- **Capture-after-Smoobu race** — if Smoobu accepts the reservation but
  Stripe `capture` then fails, the booking lands in
  `status: "confirmed" / paymentStatus: "authorized"` and the API
  returns 202. This is intentional (don't roll back Smoobu). Owner
  should reconcile manually until a retry job is built.
- **Custom OG image** — currently reusing `/images/main.jpeg`. A
  purpose-built 1200×630 hero with logo + tagline overlay performs
  better on social shares.
- **Search Console** — submit sitemap at `https://nature-line-resortkhanom.com/sitemap.xml`
  and add the verification meta tag.
- **Reviews** — once Booking/Google reviews exist, add `AggregateRating`
  to the `LodgingBusiness` schema.
- **Footer keys** — `footer.*` i18n keys were removed when the footer
  was stripped down. If a richer footer ever returns, re-add them.
- **Resend domain verification** — confirm `nature-line-resortkhanom.com` is
  verified in the Resend dashboard, otherwise owner emails will 403
  at runtime even though the build succeeds.

---

## Hidden admin / CMS (`/content`)

Three-email admin panel for editing site content without commits/deploys.

- **Auth:** Cloudflare Access at the edge — emails `greg@arkadya.tech`,
  `bradley@arkadya.tech`, `naturelineresort.lamai@gmail.com`. Configured once in
  the Zero Trust dashboard; app verifies the CF Access JWT for defense in
  depth. Dev bypass returns `dev@local`.
- **Storage:** D1 `content_overrides` (text by locale+path) and
  `content_images` (slot → R2 key). Migration `0003`.
- **R2:** `naturelineresort-media` bucket bound as `MEDIA`. Public URL set in
  `MEDIA_PUBLIC_URL` env var.
- **Read path:** `src/i18n/request.ts` deep-merges D1 overrides into the
  shipped messages JSON at SSR. Pages call `getImageUrl(slot, fallback)`
  for images. Missing overrides silently use defaults — CMS layer never
  breaks the public site.
- **Editable surfaces (v1):** hero/about/amenities/gallery/contact text,
  rooms.items.0 (name/description/beds/view/price), gallery features,
  10 image slots (logo, hero.main, about.main, rooms.standard.cover,
  gallery.0..5).
- **Setup steps for go-live** (see CLAUDE.md → "CMS / Admin Panel"):
  - Apply `drizzle/0003_handy_solo.sql` to remote D1
  - `wrangler r2 bucket create naturelineresort-media` + enable public access
  - Set Pages env vars: `MEDIA_PUBLIC_URL`, `CF_ACCESS_TEAM_DOMAIN`,
    `CF_ACCESS_AUD`
  - Add Cloudflare Access application covering `/content/*` +
    `/api/admin/*` with the 3-email policy

---

## Recent commits

```
(uncommitted) feat(cms): /content admin panel (Cloudflare Access + D1 overrides + R2 media)
(uncommitted) feat(payments): switch to 50% non-refundable deposit
(uncommitted) feat(payments): Stripe full prepayment with auth → Smoobu → capture
746328c docs: refresh resume.md, add Stripe payment as next-session task
033bb06 fix(deploy): send owner emails via Resend (Pages doesn't support send_email)
6c8a45b feat: cf email notifications, live phone, single standard room type
d42f256 docs: SEO section in CLAUDE.md + add resume.md project status
2451284 feat(seo): localized metadata, hreflang, JSON-LD, robots, sitemap
```

---

## Gotchas (see CLAUDE.md self-improvement notes)

- **Cloudflare Pages ≠ Workers.** Despite `CLAUDE.md` calling the
  hosting "Workers", the project deploys as Pages. Pages rejects the
  `[[send_email]]` binding (Workers-only) — use HTTP-based providers
  (Resend, MailChannels) instead. Same caveat applies to other
  Workers-exclusive bindings before reaching for them.
- `lucide-react@1.9.0` has no brand icons — use `SocialIcons.tsx`.
- Use `@opennextjs/cloudflare`, not `@cloudflare/next-on-pages`.
- Middleware must be `src/middleware.ts` (edge runtime), not `proxy.ts`.
- `open-next.config.ts` must use `defineCloudflareConfig()`.
- Keep `sitemap.ts` and `seo.*` i18n keys in sync with new routes.
