# Nature Line Resort — Project CLAUDE.md

Extends the global `~/.claude/CLAUDE.md`. Rules here override or extend global defaults.

---

## Client

- **Property**: Nature Line Resort Bed & Breakfast
- **Location**: Khanom, Khanom, Surat Thani, Thailand
- **Type**: Boutique B&B / Guesthouse
- **Coordinates**: 9.1900°N, 99.8400°E

---

## Locales

Four locales (extends global default of en/fr/th):

- `en` — English (default)
- `fr` — French
- `de` — German
- `th` — Thai

Message files: `messages/{en,fr,de,th}.json` — always update all four simultaneously.

---

## Brand

| Token              | Value     | Usage                                         |
| ------------------ | --------- | --------------------------------------------- |
| `brand-pink`       | `#1a6b8a` | Primary accent (matches logo bg), CTAs        |
| `brand-pink-light` | `#c4dfe8` | Backgrounds, badges                           |
| `brand-pink-dark`  | `#0e4a62` | Hover states                                  |
| `brand-blush`      | `#f0f7fb` | Soft section backgrounds                      |
| `brand-cream`      | `#f5fafd` | Page background                               |
| `brand-teal`       | `#c9a840` | Secondary accent + body text + section labels |
| `brand-teal-light` | `#f5eac4` | Dividers, soft accents                        |
| `brand-teal-dark`  | `#8a7020` | Footer bg, dark accents                       |
| `brand-ink`        | `#c9a840` | Body text (NEVER pure black)                  |
| `brand-ink-soft`   | `#4a7a8a` | Secondary text                                |

Fonts: **Libre Baskerville** (h3, refined serif) + **DM Sans** (body, geometric sans) + **Great Vibes** (.section-title and .hero-title — brushed script matching the logo wordmark). Loaded from Google Fonts in `[locale]/layout.tsx`.

Design reference: Orchid Lodge Samui (orchidlodgesamui.com) — boutique tropical aesthetic. Pink replaces sage as primary; teal replaces sage as secondary.

---

## Deployment

- **Hosting**: Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`)
- **Adapter**: `open-next.config.ts` — NOT `@cloudflare/next-on-pages` (deprecated, incompatible with Next 16)
- **Database**: Cloudflare D1 — binding name `DB` (see `wrangler.toml`)
- **Worker entry**: `.open-next/worker.js`; static assets: `.open-next/assets` (via `[assets]` binding)
- **Build**: `pnpm run build:cf` — deploy via `wrangler deploy`

---

## Environment Variables

Set in Cloudflare Pages dashboard for production. Copy `.env.example` → `.env.local` for dev.

| Variable                             | Purpose                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`                     | Resend — guest confirmations + owner alerts (single provider)                                           |
| `RESEND_FROM`                        | Default from-address for guest mail; must be on a verified Resend domain                                |
| `OWNER_EMAIL`                        | Destination address for booking + contact form notifications                                            |
| `OWNER_FROM_EMAIL`                   | From-address for owner alerts (also a verified Resend domain); falls back to `RESEND_FROM`              |
| `SMOOBU_API_KEY`                     | Smoobu REST API key — server-side only (Settings → API in Smoobu)                                       |
| `CLOUDFLARE_ACCOUNT_ID`              | For drizzle-kit remote migrations                                                                       |
| `CLOUDFLARE_D1_DATABASE_ID`          | D1 database ID                                                                                          |
| `CLOUDFLARE_API_TOKEN`               | For drizzle-kit remote migrations                                                                       |
| `STRIPE_SECRET_KEY`                  | Stripe server secret (sk*live*… / sk*test*…) — used by `/api/payment-intent` + `/api/booking` + webhook |
| `STRIPE_WEBHOOK_SECRET`              | Endpoint signing secret from Stripe Dashboard → Developers → Webhooks                                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key — exposed to the browser via NEXT*PUBLIC* prefix                                        |

---

## Smoobu Booking Integration

Native booking flow on `/book` (no iframe widget — uses Smoobu's REST API directly).

- API client: `src/lib/smoobu.ts`
- Config: `src/config/smoobu.ts` — channel IDs and apartment mapping
- Channel ID for direct-website reservations: **0**
- Apartment IDs: `0`, grouped into 3 categories (`cosy` / `deluxe` / `family`) via `APARTMENT_TO_ROOM_ID` in `src/config/smoobu.ts` (see the Rooms section below). The booking pipeline resolves apartment ↔ roomId via that config (Zod uses `z.string()`); update the map when categories change. Note: the Smoobu account also lists `3040741` (whole-property "PINK HOUSE KOH SAMUI", maxOcc 14) and two unrelated properties (QUESADA, RESIDENCE BISCHHEIM) — these are intentionally **excluded** from `SMOOBU_APARTMENT_IDS`.

**Charge model:** 50% **non-refundable deposit** collected at booking time (in THB) via Stripe. Balance is paid on arrival in cash or by card. The percentage lives in `src/config/payments.ts` (`DEPOSIT_PERCENT`) — flip that constant to change the split. The non-refundability is enforced by a required acknowledgement checkbox at the payment step + matching copy in all four locales; Stripe itself can still issue refunds from the dashboard at the owner's discretion.

**Booking flow:**

1. `BookingForm.tsx` (client) → `POST /api/availability` with date range + guests
2. Server calls `getRates` on Smoobu, returns available apartments + total price
3. User selects an apartment, fills guest details
4. Form submits to `POST /api/payment-intent`: server re-prices via Smoobu (anti-tamper), inserts a pending D1 row with `paymentStatus: "pending"` and `amountPaid = deposit` (set tentatively, finalized at capture), creates a Stripe `PaymentIntent` with `capture_method: "manual"` for the **deposit only** in THB, returns `{ clientSecret, paymentIntentId, bookingId, depositAmount, balanceDue, totalAmount, depositPercent }`
5. Client mounts `<Elements clientSecret>` + `<PaymentElement />`, shows total / deposit / balance breakdown + non-refundable acknowledgement checkbox (required), then calls `stripe.confirmPayment({ redirect: "if_required" })` — on success the intent is in `requires_capture` (deposit held, not yet charged)
6. Client posts to `POST /api/booking` with `{ ...guestData, paymentIntentId, bookingId, totalPrice }` (full stay price for Smoobu)
7. Server retrieves the intent, verifies `requires_capture` + metadata match, calls Smoobu `createReservation` with the **full stay price** (so Smoobu knows the total even though we only captured the deposit)
8. On Smoobu success: server captures the intent (deposit), updates D1 `paymentStatus: "paid"` + `amountPaid = capturedThb`, fires owner + guest emails listing total stay / deposit paid / balance due on arrival
9. On Smoobu failure: server **cancels** the intent (releases the deposit hold so the guest is never charged), marks D1 `status: "failed"` / `paymentStatus: "failed"`, returns 502
10. `POST /api/stripe/webhook` defensively syncs D1 on `payment_intent.succeeded|canceled|payment_failed` and `charge.refunded` (in case capture/cancel calls don't go through cleanly)

Note: the `amountPaid` column in `bookings` always stores the deposit captured, never the full stay total. `totalPrice` stores the full stay.

**Local development**: D1 is unavailable under `next dev`; the payment-intent + booking routes silently skip D1 inserts/updates while still calling Stripe and Smoobu. Use `pnpm preview` (wrangler) for full local D1 testing. Test the Stripe webhook locally with `stripe listen --forward-to localhost:8788/api/stripe/webhook`.

---

## Rooms

Three room categories spanning 6 physical units in Smoobu (`roomId` = the `id` of each `rooms.items` entry):

- `cosy` — 1 King, max 2 guests, from 1300 THB/night — Smoobu apartments 0, 3040766, 3040781
- `deluxe` — 1 King, max 2 guests, from 1600 THB/night — Smoobu apartment 3040756
- `family` — 1 King + 1 Single, max 3 guests, from 1400 THB/night — Smoobu apartments 3040771, 3040776

The displayed "from" price lives in `messages/*.json` (`rooms.items[n].price`) as a marketing teaser — actual nightly rates come from Smoobu's `/rates` endpoint at booking time. The availability results dedupe by category (one card per Cosy/Deluxe/Family, cheapest available unit represents it). Smoobu's REST API exposes only structured facts (occupancy, beds, price) per apartment — the room descriptions are website copy, not pulled from Smoobu. To add/change a room type: update `APARTMENT_TO_ROOM_ID` + `ROOM_TO_APARTMENT_ID` in `src/config/smoobu.ts`, append a matching item to `rooms.items` in all four locale files, add a `rooms.<id>.cover` slot in `IMAGE_SLOTS` (`src/lib/content.ts`), a section in the CMS `src/app/content/rooms/page.tsx`, and a label in `ROOM_LABELS` (`src/app/api/booking/route.ts`).

**Min-stay:** Smoobu enforces a `min_length_of_stay` (currently 2 nights). `/api/availability` reads it live from the `/rates` arrival-date data and returns `minStayRequired`; `BookingForm` shows `booking.minStayNotice` when a search is shorter than the required minimum — nothing is hardcoded.

---

## Key Files

| File                                    | Purpose                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`                      | Drizzle schema — bookings + contacts tables                                                          |
| `src/middleware.ts`                     | next-intl edge middleware (i18n routing)                                                             |
| `src/lib/resend.ts`                     | Resend HTTP wrapper + guest email templates                                                          |
| `src/lib/owner-email.ts`                | Owner alert templates (booking + contact)                                                            |
| `src/lib/validations/booking.ts`        | Zod schema for bookings                                                                              |
| `src/lib/validations/contact.ts`        | Zod schema for contact form                                                                          |
| `src/app/api/contact/route.ts`          | Contact form API                                                                                     |
| `src/app/api/booking/route.ts`          | Booking API                                                                                          |
| `messages/*.json`                       | i18n strings — en/fr/de/th (incl. `seo.*`)                                                           |
| `wrangler.toml`                         | Cloudflare D1 + Pages config                                                                         |
| `open-next.config.ts`                   | OpenNext Cloudflare adapter config                                                                   |
| `src/config/site.ts`                    | Single source of truth for SEO/JSON-LD                                                               |
| `src/components/SocialIcons.tsx`        | Inline FB/IG SVGs + `SOCIAL_LINKS`                                                                   |
| `src/app/robots.ts`                     | Robots config (allows all, disallows /api/)                                                          |
| `src/app/sitemap.ts`                    | Sitemap (4 locales × all routes + hreflang)                                                          |
| `src/lib/stripe.ts`                     | Server Stripe client (edge fetch http client)                                                        |
| `src/lib/validations/payment-intent.ts` | Zod schema for `/api/payment-intent` input                                                           |
| `src/app/api/payment-intent/route.ts`   | Re-prices via Smoobu, inserts pending D1 row, creates manual-capture intent for the deposit          |
| `src/app/api/stripe/webhook/route.ts`   | Defensive D1 sync on succeeded/canceled/refunded                                                     |
| `src/config/payments.ts`                | `DEPOSIT_PERCENT` + `depositAmount()` / `balanceDue()` helpers (charge-split single source of truth) |

---

## SEO

- **Single source of truth**: `src/config/site.ts` — URL, address, geo, social, OG image, locales. All metadata + JSON-LD pull from here.
- **Per-page metadata**: every locale page exports `generateMetadata` (async, takes `{ params }`) — title/description from `seo.*` i18n keys, canonical URL via `localePath()`, hreflang alternates via `alternateLanguages()`, OpenGraph + Twitter card.
- **JSON-LD**: `LodgingBusiness` schema lives in `src/app/[locale]/page.tsx` as the `LodgingJsonLd` server component. Phone, email, address, geo, and social all read from `src/config/site.ts` (the `SITE.phone` object exposes `e164` for `tel:`/JSON-LD, `display` for UI strings, and `waMe` for `wa.me/` links — keep these formats in sync if the number ever changes).
- **Root layout** (`src/app/layout.tsx`) sets `metadataBase`, `themeColor`, icons, and robots defaults — these inherit into all routes.
- When adding a new route: (a) add `seo.<route>.title`/`description` to all four locale files, (b) add the route to `ROUTES` in `src/app/sitemap.ts`, (c) export `generateMetadata` using the same pattern as `[locale]/page.tsx`.

---

## CMS / Admin Panel

A hidden content editor lives at `/content` (outside locale routing — no `/en/content`).
Three signed-in emails can edit:

- Text strings in `messages/*.json` (overrides stored per `(locale, path)` in D1 `content_overrides`)
- Image slots (logo, hero, room, gallery) stored in R2 `naturelineresort-media` + D1 `content_images`

**Read path:** `src/i18n/request.ts` merges D1 overrides on top of the shipped JSON at SSR time
via `applyOverrides()`. Pages read images through `getImageUrl(slot, fallback)` so missing
overrides silently fall back to `/public/images/*`.

**Auth:** Cloudflare Access at the edge. Set up in the dashboard:

1. Zero Trust → Access → Applications → Add → Self-hosted
2. Application domain: `nature-line-resortkhanom.com`, paths: `/content/*` and `/api/admin/*`
3. Policy: include — emails are one of (greg@arkadya.tech, bradley@arkadya.tech, naturelineresort.lamai@gmail.com)
4. Identity provider: One-time PIN (sends a 6-digit code by email) or Google OAuth
5. Copy the Application AUD tag → set as `CF_ACCESS_AUD` env var in Pages
6. Note your team domain → set as `CF_ACCESS_TEAM_DOMAIN` (just the subdomain, e.g. `naturelineresort`)

**R2 bucket setup (one-time):**

```
wrangler r2 bucket create naturelineresort-media
```

Make the bucket public via dashboard → R2 → naturelineresort-media → Settings → Public access (enable r2.dev URL or attach a custom domain). Copy the public URL into `MEDIA_PUBLIC_URL` env var.

**Image slots** are registered in `src/lib/content.ts` (`IMAGE_SLOTS`). Add a new slot there and
the admin UI picks it up automatically; pages reference it via `getImageUrl(slot, fallback)`.

**Adding new editable text fields:** append to the `SECTIONS` array in
`src/app/content/text/page.tsx` (or `rooms/page.tsx` for room-specific fields). Each entry is
just a `{ path, label, multiline? }` referencing a dot-path into the messages tree.

**Local dev:** `getAdminUser()` returns `{ email: "dev@local" }` when `NODE_ENV !== "production"`,
so /content is accessible without setting up Access locally.

---

## Self-Improvement

When Claude is corrected:

1. Fix the issue
2. Add a rule here (or to `~/.claude/CLAUDE.md`)
3. Note with `# Added: [date] — [reason]`

# Added: 2026-04-24 — Use @opennextjs/cloudflare (not @cloudflare/next-on-pages — deprecated and incompatible with Next 16)

# Added: 2026-04-24 — Middleware must be src/middleware.ts (edge runtime). Next.js 16 deprecated this in favour of proxy.ts but OpenNext requires edge; proxy.ts is Node.js-only and rejected by OpenNext.

# Added: 2026-04-24 — open-next.config.ts must use defineCloudflareConfig() from @opennextjs/cloudflare, not a manual config object (edgeExternals is not a typed property on OpenNextConfig).

# Added: 2026-05-06 — `lucide-react` is pinned at v1.9.0 in this repo, which predates brand icons. Do NOT import `Facebook`, `Instagram`, or any brand glyph from `lucide-react` — TS will fail Cloudflare's build. Use the inline SVGs in `src/components/SocialIcons.tsx` instead.

# Added: 2026-05-06 — When adding/changing routes, keep `src/app/sitemap.ts` and `seo.*` i18n keys in sync; missing entries silently degrade SEO without failing the build.
