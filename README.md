# Kovai Greens — microgreens operations

A React/TypeScript/Vite interface and NestJS/Prisma/PostgreSQL application for microgreens operations in Coimbatore. **Kovai Greens is a working name**, not an asserted registered business name. Set your actual identity under Settings.

## Delivery status

The latest source adds **username/password-only sign-in**, an idempotent sample-data importer, and a single-project Vercel deployment configuration using Prisma Postgres. Read [VERCEL.md](VERCEL.md) for deployment, account setup and sample-data details. Vercel and Prisma Postgres are not yet connected; cloud deployment and cloud data import are pending. The existing private Sites URL serves the previous frontend-only version.

The supplied requirements file ends mid-section 24 at “Growing B”. Only its available content informed this implementation.

## Implemented

- Responsive farm overview, crop planning, AG Grid tables, validated forms, empty/loading/error states, confirmation dialogs, CSV exports.
- Products with configurable formats and prices; suppliers and seed inventory; customers and business settings.
- Traceable growing batches, guarded lifecycle transitions, seed consumption on sowing, harvest/quality capture and inventory ledger.
- Orders with multiple products, integer-paise totals, FEFO stock reservations in whole packs, packing records, dispatch, delivery, cancellation releases, discard adjustments and compensating refunds.
- End-to-end supplier → seed lot → growing batch → harvest → allocation → packing → order → customer queries in both directions.
- Household/business subscriptions and aggregate-only school programs, explicit weekly delivery days, unique recurring occurrence keys and hourly idempotent generation of 30 days of draft orders.
- Date-aware production recommendations using unreserved demand, usable current stock, growing batch dates and expected yields.
- Delivery assignment and driver-specific backend access, routes, delivery notes, failure recording and validated rescheduling in the interface and API.
- Payments, refunds, expenses, date-filtered sales/production/expense reports, monthly customer statement screen and CSV export, backed by `/api/billing?month=YYYY-MM`.
- JWT access tokens, hashed rotating refresh tokens in HTTP-only cookies, bcrypt passwords, backend and frontend role checks, sign-in throttling, origin checks, immutable inventory ledger and audit records.
- Prisma migration with database-level inventory, harvest, seed and money constraints. Docker services for database, migrations, API, scheduler and frontend/reverse proxy.
- Separate training configuration with its own compose project, PostgreSQL volume, secrets, accounts and port. No artificial testing pages or Playwright tests. A separate explicit sample importer populates all modules with fictional business records when requested.

## Important scope and operational limits

- Recurring schedules and one-time orders support multiple products/formats. Existing single-product schedules are backfilled by the migration. School records store aggregate participation counts only.
- Orders reserve stock on confirmation. Future demand without harvested stock stays in DRAFT and is included in crop planning. Generated orders are drafts; the scheduler never invents stock or confirms unavailable produce.
- Planning reports **unreserved** demand. Already confirmed orders are covered by their reservations and are excluded from new sowing needs. No existing reservation is counted as free stock. Forecasts use expected yield and cannot guarantee actual yield.
- Harvest and stock records are immutable. Corrections require explicit discard/compensating transactions; changing historical harvest quantities is intentionally not exposed.
- Packing is generated atomically from order allocations when marking an order PACKED. Released cancelled packing becomes available bulk weight again; operators must physically unpack/relabel it. The cancellation history remains traceable.
- Cancellation of a paid order does not move money automatically. Record the real refund separately. A delivered order cannot be cancelled or restocked without a separate business returns policy, which is not implemented.
- No shelf-life, health, safety, tax or certification claims are invented. Best-before dates are optional operator input; no automatic shelf-life policy is configured. Null best-before is treated as no configured expiry; owners must validate actual stock before dispatch.
- Printable packing labels include QR PNG images linked to public consumer HTML pages. Public endpoints expose only product, batch, dates and configured farm/storage information. Set PUBLIC_ORIGIN to your externally reachable API/reverse-proxy origin before printing.
- Monthly billing endpoint produces customer statements from orders and net receipts. Formal tax invoices, GST rules, automatic monthly invoice issuance, aging buckets and accounting exports need business-specific implementation.
- Reports include sales/receipts, variety/customer/type/day/source breakdowns, yield/wastage and expenses. Batch production cost uses consumed seed cost plus explicitly assigned expenses. Estimated gross profit apportions that cost to delivered grams for orders created in the selected period, excluding tax, unallocated overhead, inventory write-offs and returns. This is an estimate, not audited accounting. Cash surplus remains separately labelled. Low-stock thresholds are configurable per product.
- Record tables use server-side search, status filters and pagination with 20/50/100 rows. AG Grid column sorting/filtering and CSV export apply to the current page; this is labelled in the interface. Streaming whole-dataset exports and global column sorting remain future work. Form reference selectors currently retrieve up to 500 records; larger catalogues need searchable remote selectors.
- Login throttling is process-local. Multi-instance deployment needs a shared rate-limit store and gateway limits. Authenticated password changes revoke all old sessions and issue a replacement session. Password recovery, MFA, monitoring, backups/restore drills and security penetration testing are not included.
- OpenAPI documentation is at `/api/docs`, including concrete resource paths and generated creation payload schemas from `apps/api/src/validation.ts`. Full audit timeline views are available for orders and growing batches.

## Quick localhost setup (Windows, macOS or Linux)

Install Node.js 22, extract the source and open a terminal in its project folder. Run:

```powershell
npm ci
npm run local
```

On first run, enter the password you selected for **Aravind** when prompted (hidden input; at least 12 characters). Open **http://localhost:4173**. The launcher starts the NestJS API, frontend, migrations and sample data. Press Ctrl+C to stop. Subsequent starts retain the records and password.

This no-Docker local option uses **PGlite**, PostgreSQL-compatible local storage accessed through the same Prisma client. Records persist in `.local-data/postgres`, which is excluded from source control and deployment packages. It is separate from Prisma Postgres cloud and is for local use. Use the Docker stack below for native PostgreSQL or [VERCEL.md](VERCEL.md) for the cloud deployment. Do not run two local launchers against the same data folder. Ports 3001 and 4173 must be free.

## Local setup with Docker

Requirements: Docker Engine with Compose v2. The supplied build targets Node 22 and PostgreSQL 16.

1. Copy `.env.example` to `.env`.
2. Generate two independent secrets using `openssl rand -hex 32`, setting `POSTGRES_PASSWORD` and `JWT_SECRET`. Hex avoids URI-encoding issues in `DATABASE_URL`.
3. Run `docker compose up --build -d`. The migration job must succeed before API/scheduler start.
4. Create the first owner. Supply the owner's username and a password of at least 12 characters via your terminal environment or secret manager; do not commit them.

```bash
docker compose exec -e OWNER_USERNAME -e OWNER_PASSWORD -e OWNER_NAME api node apps/api/dist/bootstrap.js
```

The bootstrap script refuses to modify an existing installation. Remove the password from your environment afterward. Open `http://localhost:8080`, sign in with your username and password.

For normal development, install dependencies with `npm ci`, generate the Prisma client with `npm run db:generate`, and run `npm run build`. A reachable PostgreSQL instance and `DATABASE_URL` are required for API runtime. Run migrations explicitly before starting. Load environment variables when invoking Node (`node --env-file=.env apps/api/dist/main.js`). The Vite dev server proxies `/api` to port 3001. Use `npm run dev` for the frontend.

## Separate student environment

```bash
cp .env.training.example .env.training
# Set NEW independent credentials and JWT_SECRET in .env.training.
docker compose --env-file .env.training up --build -d
```

The separate `COMPOSE_PROJECT_NAME` provides separate database containers and volumes. Bootstrap a separate owner and add student accounts with appropriate roles. Use synthetic customers only; never copy production customer, payment, school or staff records into training. The UI prominently labels the training environment from the API health response. Training is a genuine separate deployment of the same code; there is no role-switching bypass.

## Production deployment

- Deploy the full Docker stack on infrastructure you control. Put an HTTPS reverse proxy/load balancer in front of the loopback-bound frontend port. PostgreSQL and API are not exposed on host ports by default.
- Set `NODE_ENV=production`, `APP_ENV=production`, the exact HTTPS `WEB_ORIGIN`, a reachable HTTPS `PUBLIC_ORIGIN` for QR links, and unique production secrets. Use same-origin `/api` reverse proxying for reliable secure cookies.
- The latest frontend calls same-origin `/api`; Vercel routes it to the included Node Function and Docker routes it through Nginx. There is no API-origin field on the login form.
- Arrange encrypted database backups, restricted operator access, retention, restore testing, uptime/error alerts and dependency/security review before accepting real data.
- Schedule generation runs hourly through the included `scheduler` service. Pausing/cancelling a schedule stops future generation but does **not** cancel existing draft orders; review those individually.
- Keep `/api/public/package/:token` and its public trace data endpoint reachable for printed package QR links. Keep customer/order/financial endpoints behind authentication.

## Verification

```bash
npm run db:generate
npm run build
npm test
npm run test:http -w apps/api
npm run test:sample -w apps/api
```

Nine domain/database checks and the complete HTTP lifecycle suite pass in the creation environment. The disposable HTTP harness applies all migrations to PostgreSQL-compatible PGlite, exposes its PostgreSQL wire protocol on a local socket, boots the compiled NestJS application, and exercises it through real HTTP requests and Prisma. It uses a random temporary owner and database, then tears both down. Production remains PostgreSQL 16. The single-connection harness does not establish native PostgreSQL concurrency or load behaviour; validate these on your target infrastructure.

An actual HTTP API integration suite is included. Run it **only against your isolated training deployment**; it refuses production environments and creates prefixed synthetic fixtures:

```bash
TEST_API_URL=http://localhost:8081 \
TEST_OWNER_USERNAME="$YOUR_TRAINING_OWNER_USERNAME" \
TEST_OWNER_PASSWORD="$YOUR_TRAINING_OWNER_PASSWORD" \
npm run test:integration -w apps/api
```

It checks competing stock confirmations, stock transitions, traceability, payment idempotency, driver authorization, mixed-product recurrence, cancellation/rescheduling, public QR pages, monthly statements, password/session revocation, search/pagination, low-stock alerts and batch costing. The external-training version retains its synthetic fixtures for inspection. Docker startup was not verified here. Browser QA was blocked by environment access restrictions; perform desktop/mobile UAT before business use. The production build passes; chart and grid bundles still carry size warnings.

## Business acceptance walkthrough

Create product formats → supplier → seed lot → planned batch → sow → germinate → grow → ready → harvest → customer → draft order → confirm → allocate → packing → packed → assign delivery driver → dispatch → delivery → actual payment. Inspect stock movement and traceability after each stage. Test cancelling a reserved order and recording a refund separately. Verify school pack counts and future sowing recommendations with known demand before relying on forecasts.

## Extract on Windows to your E drive

Download `kovai-greens-source.zip` into your Downloads folder, then run in PowerShell:

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\kovai-greens-source.zip" -DestinationPath "E:\KovaiGreens"
Set-Location "E:\KovaiGreens\kovai-greens"
```

The archive includes frontend and backend source, Prisma schema and migrations, API tests, Docker configuration, environment templates and this guide. Dependencies and secrets are excluded. Follow the Docker setup above to run the complete application with a database; the published frontend alone does not provide a working backend.

## Sample data

Run `npm run db:setup` with the secure environment values described in [VERCEL.md](VERCEL.md), or use the included PowerShell setup script. The sample importer creates the Aravind owner account and linked sample records across all modules. It refuses a non-empty business database and never overwrites an existing owner's password. It is not run automatically on app startup. Usernames are case-insensitive; old email-based accounts migrate to their email text as their username.
