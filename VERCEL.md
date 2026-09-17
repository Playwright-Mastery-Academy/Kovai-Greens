# Vercel + Prisma Postgres deployment

This version uses a single Vercel project: React/Vite static assets plus a NestJS Node Function at `/api/*`. Every business record, user, password hash, session, setting and audit entry is stored in PostgreSQL through Prisma ORM. No business records or credentials are stored in localStorage or bundled into the frontend. Reports and planning are computed from the database.

## Current status

The application, username sign-in, sample import and function adapter are implemented and locally verified. A Vercel account and a Prisma Postgres database have not yet been connected in this session, so this version has not been deployed to Vercel and the sample data has not been inserted into a cloud database. The existing ChatGPT Sites URL serves an earlier frontend-only version.

## Connect the database and deploy

1. Create/link a Vercel project from this source directory (framework: Other; Node: 22.x). `vercel.json` defines the build, output, API routing and daily recurring-order job. Use the Vercel CLI from this directory if the source is not in a supported connected Git repository: `npx vercel` to link it, and `npx vercel --prod` after completing the steps below.
2. Attach a Prisma Postgres database to the project through Vercel's storage/marketplace integration or your Prisma account. Use the native PostgreSQL connection URL (`postgresql://...`) for this Prisma 6 client. Keep the database in your account. Use a separate database for any real production records.
3. Set server-only environment variables using `.env.vercel.example` as a checklist. `DATABASE_URL` is the Prisma Postgres runtime connection URL. `JWT_SECRET` and `CRON_SECRET` must be independent random strings of at least 32 characters. Set `NODEJS_HELPERS=0`, `NODE_ENV=production`, `APP_ENV=training`, `COOKIE_SAME_SITE=strict`. Set `WEB_ORIGIN` and `PUBLIC_ORIGIN` to your final HTTPS Vercel origin. Never prefix secrets with `VITE_`.
4. Install dependencies and generate Prisma: `npm ci` then `npm run db:generate`.
5. Apply migrations and load the sample dataset once using your direct PostgreSQL URL and the owner's password. On Windows, run `./scripts/setup-database.ps1` in PowerShell. It asks for the database URL and password using hidden input, creates username **Aravind**, applies migrations and imports the records. Enter the password you selected in the conversation. Passwords are bcrypt-hashed before storage. They are not embedded in this repository.
6. Alternatively, provide `DIRECT_DATABASE_URL` (or `DATABASE_URL`), `OWNER_USERNAME=Aravind` and `OWNER_PASSWORD` through a trusted terminal environment, then run `npm run db:setup`. Remove provisioning secrets afterward. The live application needs neither `OWNER_PASSWORD` nor a direct migration URL.
7. Deploy to production in Vercel. Sign in using **Aravind** and the password entered at setup. The login form has only Username and Password. Verify `/api/health`, then open Products, Orders, Inventory, Reports and Traceability.

Migrations and seed imports are explicit release steps, not cold-start or automatic build effects. The sample importer requires an empty business database, never deletes existing data, and uses an atomic transaction plus an idempotency marker. It does not reset an existing owner's password. Run production and preview deployments against distinct databases if you need data isolation.

## Sample dataset

| Module                                      |                                                                      Initial records |
| ------------------------------------------- | -----------------------------------------------------------------------------------: |
| Products and package formats                |                                                              6 varieties, 24 formats |
| Suppliers / seed lots                       |                                                                                3 / 6 |
| Customers                                   | 12 across household, school, restaurant, cafe, hotel, retailer and institution types |
| Growing batches / harvests / inventory lots |                                                                           12 / 6 / 6 |
| Orders                                      |              24 across all fulfillment states, including 4 upcoming recurring drafts |
| School programs / household subscriptions   |                                                        2 / 2, each with two products |
| Packing records / deliveries                |                                                                              26 / 16 |
| Payments / expenses                         |                                                                              10 / 33 |
| Team                                        |                                         Aravind owner plus 4 fictional staff records |
| Stock movements / audit entries             |                                Created for the sample inventory and business records |
| Settings, planning, billing and reports     |                                         Populated or computed from the above records |

All contact details are fictional. Staff credentials are random and undisclosed; Aravind is the only supplied usable account. You can add real users through Team & access. Prices, costs, growing parameters and dates are sample inputs, not farming or food-safety recommendations. Dates are relative to the first import; reruns preserve existing records and dates.

## Scheduled orders

Vercel invokes `/api/cron/recurrence` daily at 00:00 UTC with its `CRON_SECRET` bearer header. The endpoint rejects missing/wrong secrets. The existing Docker scheduler remains hourly. Both generate draft demand 30 days ahead with unique schedule/date keys. Manual generation remains available in the app.

## Verification and remaining checks

- `npm test`: nine domain and SQL-invariant checks.
- `npm run test:http -w apps/api`: real HTTP lifecycle, permissions, payments and recurrence.
- `npm run test:sample -w apps/api`: migrations, seed twice, username login through the actual Vercel handler, all module counts, API rewrite, stock-ledger reconciliation, reports and public cron rejection.
- `npm run vercel-build`: Prisma generation, API compilation and frontend production build.

The database harness uses PostgreSQL-compatible PGlite and Prisma over the PostgreSQL wire protocol. It is isolated and disposable. Native Prisma Postgres connectivity, deployed Vercel bundling, production concurrency and desktop/mobile browser UAT still need verification after account connection. No Playwright test suite has been added.

Provider references: [Vercel Node Functions](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration), [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [Vercel cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
