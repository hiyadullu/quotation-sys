# Pool Quotation App

Create, price, PDF and share swimming-pool quotations from a phone or a desktop.

Customers → items (from a product catalogue) → scope & terms → live preview → branded PDF → WhatsApp / email, with every quotation saved, searchable, duplicable and revisable.

- [What's in the box](#whats-in-the-box)
- [Quick start](#quick-start-local) · [Environment variables](#environment-variables-env) · [Day-to-day commands](#day-to-day-commands)
- [How it works](#how-it-works) (pricing, numbering, versions, roles, sharing)
- [Deploying](#deploying)
- [Troubleshooting](#troubleshooting)
- [What I need from you / what's missing](#what-is-missing--what-you-need-to-provide)
- [Project structure](#project-structure)

---

## What's in the box

| Scope-document area | Implemented |
|---|---|
| Login (email **or** mobile + password), roles | Admin / Sales. Sessions in an httpOnly cookie, rate-limited sign-in, deactivate users instantly |
| Dashboard | Quotes created / sent / accepted / awaiting reply, recent quotes, big **Create new quote** |
| Customers | Search by name / mobile / city, add inline while quoting, edit, delete (blocked if quotes exist) |
| Product & service master | Equipment · Plumbing · Civil · Services, brand/model/unit/price/GST, image, archive instead of delete |
| Quotation builder | Customer → Items → Scope & terms → Preview → PDF. Auto-save between steps. Discount (₹ or %), transport/other charges, per-line GST, live totals |
| Templates | Scope of work, payment milestones (must total 100 %), terms & conditions; one default per kind |
| Numbering & dates | `QT-2026-00125` (prefix configurable, **atomic** counter), date and validity auto-filled |
| PDF | Branded A4 PDF (logo, GSTIN, tax breakup, amount in words, payment schedule, bank/UPI, signature). Same HTML is used for the in-app preview, so *what you preview is what you send* |
| Sharing | **WhatsApp** (pre-filled chat + public PDF link, plus "share file" on phones), **Email** (SMTP, PDF attached, editable message), **Download** |
| History | Search by number / customer / mobile / date, filter by status, **Duplicate**, **Revise** (V2, V3 … same number), activity log, Accepted / Rejected tracking |
| Settings | Company, logo, signature, bank, GST default, prefix, validity, warranty, templates, users |
| Reports (admin) | Totals, sent / accepted / rejected, conversion rate, value by month |
| Mobile | Responsive, bottom navigation with an always-visible **New quote** button, installable as an app (PWA) |

### Tech stack

| Layer | Choice |
|---|---|
| Web | React 18 · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · React Hook Form + Zod |
| API | Node 22 · Express 5 · TypeScript · Zod validation · pino logging · helmet |
| Database | PostgreSQL 14+ · Prisma 6 (Rust-free client through the `pg` driver) |
| PDF | Puppeteer (Chrome) rendering the same HTML template used for preview |
| Email | Nodemailer (any SMTP provider) |
| Shared | `@pool-quote/shared`: Zod schemas, types and the **pricing engine** used by *both* browser and server, so totals can never disagree |

Your recommended stack is used as-is. Two additions: Zod + a shared package (one definition of every rule), and TanStack Query for data fetching.

---

## Quick start (local)

**You need:** [Node.js 22](https://nodejs.org) (`nvm use` reads `.nvmrc`), and either Docker *or* a local PostgreSQL 14+.

```bash
# 1. Environment file
cp .env.example .env
#    → open .env and set JWT_SECRET (command is in the file). Everything else works as-is for local dev.

# 2. Database + mail catcher (skip if you have your own Postgres, see below)
docker compose up -d

# 3. Install, create tables, load starter data
npm run setup

# 4. Run API + web together
npm run dev
```

Open **http://localhost:5173**

| Login | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `ChangeMe@123` |
| Sales (demo) | `sales@example.com` | `Sales@12345` |

Change both passwords after first sign-in (**My account**). Set your own admin e-mail/password *before* step 3 via `SEED_ADMIN_*` in `.env`.
Sent emails appear at **http://localhost:8025** (Mailpit).

`npm run setup` = install → build shared package → generate Prisma client → create the first migration (`prisma/migrations`, **commit it**) → seed.
The seed adds company defaults, 15 sample products, default templates (scope, payment, terms), and (unless `SEED_DEMO_DATA=false`) 3 customers and 3 sample quotations. The first sample reproduces the worked example in your scope document: ₹2,31,000 − ₹10,000 discount + 18 % GST = **₹2,60,780**.

### Without Docker

```bash
# any PostgreSQL 14+; example with psql
createuser --pwprompt poolquote
createdb --owner poolquote poolquote
```
Then put the matching URL in `.env` → `DATABASE_URL=postgresql://poolquote:YOURPASS@localhost:5432/poolquote?schema=public`.
For email testing without Mailpit, use your real SMTP details or leave email unconfigured (the Email button then explains what's missing).

### Ports

| Service | URL |
|---|---|
| Web (dev) | http://localhost:5173 (proxies `/api` to the API) |
| API | http://localhost:4000 |
| Postgres (Docker) / Mailpit | `5434` / SMTP `1025`, UI `8025` |

---

## Environment variables (`.env`)

One `.env` at the repository root is shared by the API, the Prisma CLI and the seed script. See `.env.example` (fully commented).

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | ≥ 32 chars. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Changing it signs everyone out |
| `APP_BASE_URL` | yes | Public address of the app. Used to build the PDF link in WhatsApp/email messages. Dev: `http://localhost:5173`. Production: `https://quotes.yourdomain.in` |
| `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN` | no | Defaults 4000 / development / 7d |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | for email | `MAIL_FROM` example: `"ABC Pools <quotes@abcpools.in>"`. Port 465 → `SMTP_SECURE=true`; 587 → `false` |
| `PUPPETEER_EXECUTABLE_PATH` | no | Use your own Chrome/Chromium instead of the one Puppeteer downloads |
| `TRUST_PROXY` | behind a proxy | Set `1` on Render / Railway / Nginx / Cloudflare so rate-limiting sees real client IPs |
| `SEED_ADMIN_NAME` `SEED_ADMIN_EMAIL` `SEED_ADMIN_PASSWORD` `SEED_DEMO_DATA` | seed only | First admin account; `SEED_DEMO_DATA=false` skips demo customers/quotes |

---

## Day-to-day commands

```bash
npm run dev          # API (auto-reload) + web (hot reload) + shared package watcher
npm run typecheck    # TypeScript across all packages
npm test             # pricing engine, schemas, quotation renderer
npm run build        # production build of all three packages
npm start            # run the built API (also serves the built web app)

npm run db:migrate -- --name add_something   # after editing prisma/schema.prisma
npm run db:deploy    # apply committed migrations (production)
npm run db:seed      # idempotent: never overwrites existing data
npm run db:studio    # browse the database in the browser
```

---

## How it works

**Pricing** (`packages/shared/src/pricing.ts`, unit-tested). Everything is computed in integer paise.
`line = qty × rate` → discount (flat ₹ or %) is taken off the subtotal and spread pro-rata over the lines → each line is taxed at *its own* GST % on its discounted value → transport/other charges are added after the discount and taxed at their own rate → grand total. The PDF's "GST @ x %" rows are grouped by rate. No rounding to the nearest rupee is applied (totals keep paise).

**Quote numbers.** `PREFIX-YEAR-00001`, incrementing per calendar year through one atomic database update, so two people creating quotes at the same instant can't get the same number. Numbers are never reused (deleting a draft leaves a gap, as is normal for accounting).

**Lifecycle.** `Draft` (editable) → `Sent` → `Accepted` / `Rejected`. Once a quote leaves Draft it is **frozen**; to change it, press **Revise** → new version of the same number (`QT-2026-00125 V2`), earlier versions stay readable. **Duplicate** makes a new quote with a new number. A draft becomes *Sent* automatically when you email it or tap WhatsApp.

**Roles.** *Admin*: everything, all quotes, products, settings, users, reports. *Sales*: customers, own quotes, read-only catalogue. (Customers are shared across the team.)

**WhatsApp — important limitation.** Without the paid WhatsApp Business API, a web page cannot attach a file to a chat. So the app opens WhatsApp with the customer's number and a pre-written message containing a **secure link to the PDF** (unguessable token, no login needed). On phones that support it there is also **Share PDF file**, which attaches the real file via the system share sheet. Automatic, no-tap sending needs the WhatsApp Business Cloud API (needs a Meta business account, template approval, per-message fees) — see "Decisions" below.

**PDF.** The server renders one HTML document (`apps/server/src/pdf/quote-document.ts`) — inline fonts/images, JavaScript disabled, all network blocked — and prints it with headless Chrome. The in-app preview shows that same HTML.

**Uploads** (logo, signature, product photos: PNG/JPG/WebP ≤ 2 MB) are stored *in PostgreSQL*, so one database backup captures everything and the app needs no persistent disk.

**Security basics in place:** bcrypt passwords, httpOnly + SameSite=Lax session cookie (Secure in production), login rate-limit, helmet headers, strict Zod validation on every input, escaped HTML in PDFs (tested), SVG uploads rejected, role checks on the server for every admin route, drafts-only editing enforced server-side.

---

## Deploying

The app is **one Node service + one PostgreSQL database** (the API serves the built web app, so there is no CORS and the cookie "just works").

```bash
npm ci
npm run build
npm run db:deploy      # applies prisma/migrations  (commit the migrations folder first!)
npm run db:seed        # first time only
npm start
```

Checklist for production:
- Set `NODE_ENV=production`, a strong `JWT_SECRET`, `APP_BASE_URL=https://your-domain`, real `SMTP_*`, and `TRUST_PROXY=1` behind a proxy. **HTTPS is required** (the session cookie is `Secure`).
- Chrome is needed for PDFs. On a VPS: `sudo apt install chromium` and set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`. A `Dockerfile` that does this is included.
- Give the container **≥ 1 GB RAM** (Chrome). Free tiers at 512 MB may crash on PDF generation.
- Turn on automated **database backups** with your host. That is your only data store.
- Seed users: change the default passwords immediately.

Works on any host that runs Node + Postgres (Render, Railway, Fly.io, a VPS with Nginx/Caddy, …).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Invalid environment configuration` on start | `.env` missing or incomplete → copy `.env.example`; `JWT_SECRET` must be ≥ 32 chars |
| `Can't reach database server` | Postgres not running (`docker compose up -d`) or wrong `DATABASE_URL` (Docker uses port `5434`; a separately installed PostgreSQL can use `5432`) |
| "The PDF engine is not available" | Chrome did not download/launch. `npx puppeteer browsers install chrome`, or install Chromium and set `PUPPETEER_EXECUTABLE_PATH`. On Linux servers you may need `libnss3 libatk-bridge2.0-0 libgbm1 libasound2` |
| `npm install` fails at Puppeteer's Chrome download (for example, a corrupt ZIP) | In PowerShell, set `$env:PUPPETEER_SKIP_DOWNLOAD = "1"` and rerun `npm run setup`. Install Chrome separately, then set `PUPPETEER_EXECUTABLE_PATH` in `.env` to its full executable path (for example, `C:\Program Files\Google\Chrome\Application\chrome.exe`). |
| `npm warn cleanup` reports `EBUSY` for `node_modules` | Stop any running app/dev-server processes using this project's dependencies, then rerun setup. This warning is separate from a Puppeteer browser-download failure. |
| Email button says "not configured" | Set `SMTP_HOST` and `MAIL_FROM` in `.env`, restart `npm run dev` |
| Changed `schema.prisma` | `npm run db:migrate -- --name what_changed` |
| Port already in use | Change `PORT` (API) or `server.port` in `apps/web/vite.config.ts` |
| WhatsApp link opens but the customer can't download | `APP_BASE_URL` must be a **publicly reachable** URL. `localhost` only works on your own computer — in production use your domain |

---

## What is missing / what you need to provide

**To go live, I need from you** (all editable later in *Settings* — nothing is hard-coded):

1. **Company details:** legal name, tagline, address, phone, email, website, **GSTIN**.
2. **Logo** (PNG with transparent background, ≥ 400 px wide) and a **scanned signature** (transparent PNG).
3. **Bank & UPI details** to print on quotations.
4. **Your real price list:** the 15 seeded items are placeholders (the prices are samples). Names, units, brands/models, prices, GST %, and photos if you want them.
5. **Your standard text:** scope-of-work wordings, payment-milestone schedules, terms & conditions, warranty clause. The seeded ones are generic; have them reviewed before sending to customers.
6. **Quote-number format** preference (prefix, per-year vs. financial-year numbering), and default validity days.
7. **Team:** names/emails/mobiles and who is Admin vs Sales.
8. **Hosting & domain**, plus **SMTP credentials** (Google Workspace, Zoho, Brevo, SES …).

**Decisions that change the build** (tell me and I'll adapt):

- **GST presentation:** the PDF shows GST grouped by rate. If you need an **intra-state CGST+SGST vs inter-state IGST** split (place of supply, customer state), that's an addition — it requires customer state to be captured.
- **WhatsApp:** link-based (built) vs the **WhatsApp Business Cloud API** (fully automatic sending, delivery status; needs Meta verification and per-message cost).
- **Round-off line** (nearest ₹) on the grand total? Currently totals keep paise.
- **Should sales staff see each other's quotes?** Currently they only see their own.
- **Customer-side acceptance** (customer clicks "Accept" / e-signs a link) — not in v1; today acceptance is recorded manually.
- **Customer details frozen on sent quotes?** Currently a PDF regenerated later reflects the customer's *current* name/address. Easy to snapshot if you want legal immutability.
- Languages (Hindi/regional PDF), multiple companies/branches, inventory, UPI QR on the PDF, payment tracking against milestones — good v2 candidates.

---

## Project structure

```
pool-quote/
├── package.json            npm workspaces + scripts
├── .env.example            copy to .env
├── docker-compose.yml      Postgres + Mailpit for local dev
├── Dockerfile              production image (API + web + Chromium)
├── packages/
│   └── shared/             Zod schemas, DTO types, pricing engine, INR/words helpers (+ tests)
└── apps/
    ├── server/
    │   ├── prisma/         schema.prisma, seed.ts, migrations/ (created by `npm run setup`)
    │   ├── src/
    │   │   ├── config/     validated env
    │   │   ├── lib/        prisma client, errors, http helpers, dates, logger
    │   │   ├── middleware/ authenticate / roles / error handler
    │   │   ├── modules/    auth · users · customers · products · templates · settings
    │   │   │               assets · quotes (service, routes, documents) · reports · public
    │   │   ├── pdf/        quote-document.ts (HTML template), pdf.service.ts (Chrome), fonts.ts
    │   │   └── mail/       SMTP delivery
    │   └── test/
    └── web/
        └── src/
            ├── auth/       session context
            ├── lib/        api client, react-query hooks, form mapping, formatting
            ├── components/ ui/ (design system) · layout/ · quote/ (builder steps, preview, share)
            └── pages/      Dashboard, Quotes, QuoteEditor, QuoteView, Customers, Products, Reports, Settings/*
```

Adding a field to quotations is a four-place change, each type-checked: `schema.prisma` → `shared/schemas.ts` (+`types.ts`) → `quotes.service.ts` / `quotes.mapper.ts` → the editor step.
