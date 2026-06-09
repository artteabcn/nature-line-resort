# Operator Setup — Nature Line Resort Template

This document is for **you** (the agency operating this template across multiple clients)
and for **future AI sessions** coming back cold to this repo. It covers your standing
account setup, what state lives where, and the fastest way to get productive again after
weeks away.

> If you're cloning this template for a new client → read **CLONING.md**, not this file.
> This one is operator-side.

---

## Resume cheat sheet (read this first in a new session)

You're in a new chat with no context. Do this in order:

1. **`CLAUDE.md`** — global + project-specific rules (stack, conventions, gotchas).
2. **`resume.md`** — current project status, what's open, what just shipped.
3. **`memory/MEMORY.md`** — auto-memory index (e.g. "Nature Line Resort deploys to Pages, not Workers").
4. **`git log --oneline -10`** — what's actually been committed lately.
5. **`git status`** — anything uncommitted in the worktree?

If any of those mention "uncommitted" work in `resume.md`, treat that as a TODO that
wasn't finished — read the relevant files before assuming the next step.

To verify the production site is healthy without poking anything destructive:

```powershell
Invoke-WebRequest -Uri "https://nature-line-resortkhanom.com/api/health" -UseBasicParsing
# expect: {"ok":true}
```

To verify the CMS is reachable:

```powershell
Invoke-WebRequest -Uri "https://naturelineresort.pages.dev/content" -UseBasicParsing -MaximumRedirection 0
# expect: 307 redirect to / (CF Access not in front of *.pages.dev — that's correct;
# /content auth is only on the apex domain)
```

To see all running deployments and which one is production:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="a28e85c8d0762c4391b0f1dde60b6e75"
node node_modules\wrangler\bin\wrangler.js pages deployment list --project-name naturelineresort
```

---

## Operator-owned accounts

You (Arkadya) own these across all clients. The owner of each property never gets
direct access.

| Service     | Why you own it                                                           | Hand off?         |
| ----------- | ------------------------------------------------------------------------ | ----------------- |
| Cloudflare  | DNS + Pages + D1 + R2 + Access all live here. Multi-tenant by design.    | Never             |
| GitHub      | Source of truth for the code. Owners don't write code.                   | Never             |
| Resend      | One Resend account can verify many domains. You manage the API keys.     | Never             |
| Anthropic / | AI assistance during dev. Owners don't interact with it.                 | Never             |
| Domain      | Usually you register in the owner's name but keep DNS at CF (your acct). | Optional, on exit |

Owner-owned (legally must be theirs):

| Service | Why it's theirs                                                                         |
| ------- | --------------------------------------------------------------------------------------- |
| Stripe  | They receive the money. KYC + bank details are theirs.                                  |
| Smoobu  | They run the property; subscription paid by them.                                       |
| Email   | `hello@<their-domain>` lands in their inbox (via Cloudflare Email Routing or wherever). |

---

## First-time operator setup (one-time, before your first clone)

If you've never built a project from this template before, do this once. Future clones
reuse the accounts.

### Cloudflare account

1. Create a Cloudflare account.
2. Dashboard → **R2** → **Enable R2** (one-time, accept the TOS). Free tier is enough
   for years of operation but you have to enable it explicitly.
3. Dashboard → **Zero Trust** → set up the team subdomain (yours is `artteabcn`).
   Free for ≤ 50 users.
4. Create a Cloudflare API token with these permissions for `wrangler` from a CI/local
   machine: Account → Cloudflare D1: Edit, Account → Cloudflare Pages: Edit, Account →
   Workers Scripts: Edit, Zone → DNS: Edit (only if you want wrangler to manage DNS).
   Save as `CLOUDFLARE_API_TOKEN` in your local shell env. Your account ID is the long
   hex string in any dashboard URL.

### GitHub

1. Create a GitHub org (or use your personal account). The template repo
   (`artteabcn/PinkHouse`) is the canonical source.
2. Install the `gh` CLI locally: <https://cli.github.com/>.
3. `gh auth login` once.

### Resend

1. Sign up at <https://resend.com>. Free tier: 3,000 sends/month, 100/day.
2. You'll add per-domain verifications later, one per client.
3. Create one **API key** per client (so you can rotate without affecting others).
   Save each in the client's Cloudflare Pages env, not in your local shell.

### Local toolchain (developer machine)

| Tool           | Version      | Why                                                                                              |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| **Node**       | 20+ (LTS)    | Next 15 requires Node 20 minimum                                                                 |
| **pnpm**       | **10.x**     | **Pinned via corepack** — pnpm 11's store layout breaks OpenNext on Windows. See "Quirks" below. |
| **wrangler**   | latest (≥ 4) | Bundled as dep, no global install needed                                                         |
| **gh CLI**     | latest       | Repo + PR management                                                                             |
| **PowerShell** | 5.1+ (Win)   | Or bash on macOS/Linux                                                                           |
| **Git**        | latest       | Hooks via husky                                                                                  |

To pin pnpm 10 in a fresh shell:

```powershell
corepack prepare pnpm@10.18.2 --activate
pnpm --version  # should print 10.x
```

(If `corepack` says it's not enabled: `corepack enable` first.)

---

## State sources — where every piece of state lives

When something looks wrong, this table tells you where to go look.

| State type         | Lives in                                              | Authoritative?          |
| ------------------ | ----------------------------------------------------- | ----------------------- |
| Source code        | GitHub (`origin/main`)                                | Yes                     |
| Schema definitions | `src/db/schema.ts` (Drizzle)                          | Yes — migrations derive |
| Database content   | Cloudflare D1 (`naturelineresort` database)                  | Yes — single source     |
| Uploaded images    | Cloudflare R2 (`naturelineresort-media` bucket)              | Yes — single source     |
| Default images     | `public/` (in git)                                    | Yes — for unset slots   |
| Localized text     | `messages/*.json` (defaults) + D1 `content_overrides` | Merged at SSR           |
| Brand tokens       | `src/app/globals.css` (`@theme` variables)            | Yes                     |
| Secrets (live)     | Cloudflare Pages → Environment variables → Production | Yes                     |
| Secrets (dev)      | `.env.local` (gitignored)                             | Local-only              |
| Auth policy        | Cloudflare Zero Trust → Access → Applications         | Yes                     |
| Booking records    | Smoobu (the PMS) **AND** D1 `bookings`                | Smoobu wins on conflict |
| Stripe payments    | Stripe Dashboard **AND** D1 `bookings.paymentStatus`  | Stripe wins on conflict |
| Outbound email log | Resend → Logs                                         | Yes                     |
| Inbound email      | Cloudflare Email Routing forwards → Gmail             | Owner's Gmail           |
| DNS records        | Cloudflare DNS                                        | Yes                     |
| TLS certs          | Cloudflare (auto-managed)                             | Yes                     |
| Build artifacts    | `.open-next/` (gitignored, regenerated)               | Throwaway               |
| Deploy history     | Cloudflare Pages → Deployments                        | Audit trail only        |

**Mental model:** code in git, structured data in D1, blobs in R2, secrets in CF, identity
in CF Access, money in Stripe, bookings in Smoobu, email in Resend.

---

## Useful commands (copy-paste reference)

```powershell
# Local dev (no D1, no R2 — bindings unavailable; admin auth bypassed to dev@local)
pnpm dev

# Type check + lint (run before committing)
node node_modules\typescript\bin\tsc --noEmit
node node_modules\eslint\bin\eslint.js src --max-warnings 0

# Tests
pnpm test         # vitest (unit)
pnpm test:e2e     # playwright

# Drizzle: generate migration after schema.ts changes
node node_modules\drizzle-kit\bin.cjs generate

# Apply migrations to remote D1 (PRODUCTION — read the migration first)
$env:CLOUDFLARE_ACCOUNT_ID="a28e85c8d0762c4391b0f1dde60b6e75"
node node_modules\wrangler\bin\wrangler.js d1 migrations apply naturelineresort --remote

# Apply migrations to local D1 sandbox (use with pnpm preview)
pnpm db:migrate:local

# Full local preview with D1 + R2 bindings active (closest to prod)
pnpm preview

# Build for Cloudflare (Windows post-step has to be done by hand)
$env:CI="true"; pnpm run build:cf
# then on Windows:
Move-Item .open-next\worker.js .open-next\_worker.js
Copy-Item -Recurse -Force .open-next\assets\* .open-next\
node -e "const fs=require('fs');fs.writeFileSync('.open-next/_routes.json',JSON.stringify({version:1,include:['/*'],exclude:['/_next/static/*','/_next/image/*','/images/*','/logo.png','/favicon.ico','/robots.txt','/sitemap.xml']}))"

# Deploy
$env:CLOUDFLARE_ACCOUNT_ID="a28e85c8d0762c4391b0f1dde60b6e75"
node node_modules\wrangler\bin\wrangler.js pages deploy .open-next --project-name naturelineresort --commit-dirty=true

# List recent deployments + see which is production
node node_modules\wrangler\bin\wrangler.js pages deployment list --project-name naturelineresort

# Live shell into a Smoobu rates query (useful for "no rooms available" debugging)
curl -H "Api-Key: <SMOOBU_API_KEY>" "https://login.smoobu.com/api/rates?apartments[]=0&start_date=2026-06-10&end_date=2026-06-12"

# Tail R2 bucket contents
node node_modules\wrangler\bin\wrangler.js r2 object list naturelineresort-media

# Show D1 row count for bookings (sanity check after a booking flow test)
node node_modules\wrangler\bin\wrangler.js d1 execute naturelineresort --remote --command "SELECT COUNT(*) FROM bookings"
```

---

## Conventions

- **Branching:** `main` is production. Feature branches: `feature/<short>`, fixes:
  `fix/<short>`. No release branches.
- **Commits:** conventional commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
  Trailing co-author line for AI-pair commits.
- **PRs:** for non-trivial changes. For solo agency work, direct commits to `main` are
  also fine as long as the test suite + typecheck pass locally first.
- **Migrations:** every D1 schema change goes through `drizzle-kit generate`. Never edit
  a committed migration; create a new one.
- **Secrets:** never in code, never in `.env.example`, never in commits. Cloudflare Pages
  env or `.env.local` only.

---

## Quirks (things that have bitten this project)

These are sharper than the general gotchas in CLONING.md — they're specific to _this_
codebase running on _your_ dev box.

### Pin pnpm to 10.x

pnpm 11 changed the global store path in a backwards-incompatible way. On Windows this
combines with OpenNext's `copyPackageTemplateFiles` step to produce "Access is denied"
errors on symlinked dependencies (`react`, `styled-jsx`, etc.) during the bundle. We
landed on pnpm 10.18.2 + `.npmrc` with `node-linker=hoisted` + `pnpm-workspace.yaml`
with `allowBuilds` set for native modules. This setup is reproducible and committed.
If anyone bumps pnpm globally, run `corepack prepare pnpm@10.18.2 --activate` in this
repo to override.

### `build:cf` post-steps are Unix-only

The script chains `&& mv … && cp -r …` which fails on Windows. Manual steps in
"Useful commands" above. On CF Pages' Linux build runners (git-integrated deploys),
the script works as-is. **For ongoing operation we recommend switching this project to
git-integrated Pages deploys** — you skip the Windows pain entirely.

### Cloudflare Access needs **three** path patterns

`/content` alone doesn't cover `/content/text` or `/api/admin/*`. Always add:

- `<apex>` `/content`
- `<apex>` `/content/*`
- `<apex>` `/api/admin/*`

Symptom of missing patterns: user logs in via CF Access, gets bounced to `/` immediately
(our `requireAdmin()` redirects because the CF JWT header isn't being injected into
unprotected paths).

### `MEDIA_PUBLIC_URL` must include `https://`

Set `https://media.<apex>` not `media.<apex>`. Without the scheme, `<img src>` becomes
protocol-relative and breaks in emails / OG cards.

### Next 15's `next-env.d.ts` trips strict ESLint

Auto-generated triple-slash references aren't valid under
`@typescript-eslint/triple-slash-reference`. `eslint.config.mjs` already excludes
`next-env.d.ts`; `package.json` lint-staged passes `--no-warn-ignored`. If the lint
hook starts failing on this file after a Next upgrade, re-check the ignore is intact.

### Resend + custom from-address

The from-address domain (in `RESEND_FROM`) must be **verified in Resend** (DNS records
added in Cloudflare). Resend will 403 sends from any other domain. The "to" domain has
no such restriction. When changing apex domain, re-verify in Resend before deploying.

### Stripe live vs test mode mismatch

`pk_live_…` paired with `sk_test_…` produces "Invalid API Key" only at confirm time
(after the user has filled in the card form). Both keys must be the same mode. The
publishable key is build-time inlined, so changing modes requires a rebuild.

### Pages env vars: Production vs Preview scope

Variables set in **Preview** environment only apply to preview deployments. The
production worker doesn't see them. When something works in preview but not on the apex
domain, check that the env var was added under the **Production** tab too. (Bit us
with `OWNER_EMAIL` during the Resend setup.)

### Smoobu near-term availability

If Smoobu's `/rates` endpoint returns `available: 0` for every apartment on near-term
dates (e.g. next 14 days), it's usually a Smoobu-side calendar issue — owner hasn't
published availability, or a "minimum advance notice" rule is set. **Not a code bug.**
Diagnose by hitting `/rates` directly (see "Useful commands"). The booking flow code is
working correctly when it filters those out.

---

## When something breaks — first-pass diagnostics

| Symptom                                      | Most likely cause                                         | Check                                                 |
| -------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| Site returns 500 / 502                       | D1 query failed, or R2 binding missing                    | CF Pages → Functions logs                             |
| Booking page returns "no rooms"              | Smoobu calendar issue, not code                           | `curl https://login.smoobu.com/api/rates …`           |
| `/content` redirects to `/` after CF login   | CF Access app missing `/content/*` or `/api/admin/*` path | Zero Trust → Access → Applications → Edit             |
| `/content` redirects to `/` _immediately_    | `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` wrong/missing   | Pages env (Production scope), JWT verify in logs      |
| Image upload succeeds but URLs are broken    | `MEDIA_PUBLIC_URL` missing `https://`                     | Pages env                                             |
| Contact form: `OWNER_EMAIL not configured`   | Env var set on Preview only, not Production               | Pages env (Production tab)                            |
| Contact form: Resend 403 "domain unverified" | DNS not propagated or wrong apex                          | Resend → Domains                                      |
| Stripe confirmPayment: "Invalid API Key"     | Live/test mode mismatch                                   | Match prefixes of all three Stripe keys               |
| Build error: "Access is denied" on react/    | pnpm 10 vs 11 store mismatch on Windows                   | `pnpm --version`, run `corepack prepare pnpm@10.18.2` |
| Email never arrives in inbox                 | Resend logs, then check spam, then check Email Routing    | Resend → Logs                                         |
| /content shows broken-image previews         | `IMAGE_SLOTS` fallback points at missing file             | `ls public/images/`, fix `src/lib/content.ts`         |

---

## Useful URLs (bookmark these)

| Service                  | URL                                                                            |
| ------------------------ | ------------------------------------------------------------------------------ |
| Production site          | <https://nature-line-resortkhanom.com>                                                |
| Pages dashboard          | <https://dash.cloudflare.com/?to=/:account/pages/view/naturelineresort>               |
| D1 dashboard             | <https://dash.cloudflare.com/?to=/:account/workers/d1>                         |
| R2 dashboard             | <https://dash.cloudflare.com/?to=/:account/r2/default/buckets/naturelineresort-media> |
| Cloudflare Access        | <https://one.dash.cloudflare.com/?to=/:team/access/apps>                       |
| Resend                   | <https://resend.com/domains>                                                   |
| Stripe Dashboard         | <https://dashboard.stripe.com>                                                 |
| Smoobu (the PMS)         | <https://login.smoobu.com>                                                     |
| GitHub repo              | <https://github.com/artteabcn/PinkHouse>                                       |
| Cloudflare Email Routing | <https://dash.cloudflare.com/?to=/:account/:zone/email/routing>                |

---

## Onboarding a teammate

When a new collaborator joins the agency:

1. Add their email to the **`Editors` policy** in the CF Access "Nature Line Resort CMS" app
   (Zero Trust → Access → Applications → Nature Line Resort CMS → Edit → Policies).
2. Add them as a collaborator on the **GitHub repo**.
3. Give them read access to **Cloudflare Pages** (Account Members in CF dashboard).
   Don't grant write access unless they're going to deploy.
4. Hand them this file + CLAUDE.md + CLONING.md. They should be productive within an hour.

For Stripe / Smoobu / Resend access: they don't need it. The CMS plus the GitHub repo
is the full surface for ongoing edits.

---

## Backup / disaster recovery

What happens if Cloudflare loses your data? (Unlikely but worth thinking through.)

- **Code:** safe — it's in GitHub.
- **D1:** no automatic backup. Schedule a weekly export:
  ```powershell
  $env:CLOUDFLARE_ACCOUNT_ID="a28e85c8d0762c4391b0f1dde60b6e75"
  node node_modules\wrangler\bin\wrangler.js d1 export naturelineresort --remote --output=backups/naturelineresort-$(Get-Date -Format yyyy-MM-dd).sql
  ```
  Commit to a private backups repo or upload to your own storage. Bookings are the
  critical data — losing 30 days of D1 means re-reconstructing from Smoobu + Stripe.
- **R2:** durable by design (11 nines). Not backed up locally. Acceptable risk.
- **Secrets:** Cloudflare Pages env values aren't backed up by Pages itself. Keep a
  password-manager record of every env var you set, per project. If your CF account
  vanishes, you need to recreate them from the password manager.

For most failures the recovery is just: re-deploy from GitHub + reapply migrations + set
env vars from the password manager. D1 data is the irreplaceable piece.

---

## What to update in this file

When something changes operator-side, update this file. Specifically:

- Pinned tool versions (Node, pnpm) — when you upgrade
- New quirks you hit and resolve
- New URLs / dashboards
- New teammates
- DR procedure changes

Treat it like a runbook. The goal is: a fresh session, weeks from now, lands on this
file and gets up to speed in 10 minutes.
