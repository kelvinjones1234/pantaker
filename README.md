# PANTAKER

A circular-economy marketplace for unwanted items, scrap, and recoverable
materials. Launch market: **Abuja, FCT, Nigeria**.

Pantaker is a Next.js app backed by PostgreSQL, Prisma, and NextAuth, with
Cloudflare Images for listing photos. Sales are recorded by the seller after an
off-platform handover; Pantaker does not process payments or hold funds.

## Quickstart

```bash
npm install
# create .env in the project root and fill in the values you need
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL` the marketplace renders clearly-labelled sample data and
auth previews. That fallback is for local development only: in production the
middleware returns `503` unless the required environment is set.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |

## Database migrations

Apply every file in `supabase/migrations/` **in filename order**. The SQL files
are the schema source of truth: do not use `prisma db push` or `prisma migrate`
for the marketplace. Prisma is the client/data layer only; it is generated from
the SQL-managed schema (`npm run prisma:generate`).

| Migration | Purpose |
|---|---|
| `0000_base_schema.sql` | Base tables, constraints, and indexes |
| `0001_rls_policies.sql` | Legacy public/seller RLS policies (since revoked) |
| `0002_sales.sql` | Seller-recorded sales |
| `0003_messaging.sql` | Conversations, messages, blocks, reports |
| `0004_notifications.sql` | In-app notifications and preferences |
| `0005_admin.sql` | Admin roles/permissions |
| `0006_categories_admin.sql` | Category admin audit |
| `0007_account_restrictions.sql` | Restrictions and admin audit |
| `0008_moderation_and_integrity.sql` | Moderation, reports, search, upload limits |
| `0009_listing_contract_alignment.sql` | Listing contract alignment |
| `0010_nextauth_identity.sql` | `public.users`, login OTPs, email changes, admin roles |
| `0011_app_auth_context.sql` | Transaction-local auth context for app access |
| `0012_lock_down_public_api.sql` | Revokes browser access; RLS stays enabled |

Set `DATABASE_URL` (session pooler) and `DIRECT_URL` (direct host) for Prisma CLI
commands. Database access is owner-level through Prisma; the browser never talks
to Postgres directly. Migrations must be applied with a role that can alter the
schema.

### Local image storage (development only)

For local development you can store listing and avatar photos on disk instead of
configuring Cloudflare:

```dotenv
PANTAKER_IMAGE_MODE=local
LOCAL_UPLOAD_DIR=.local-uploads
LOCAL_UPLOAD_SECRET=change-me-for-local-dev
```

Uploads are written to `.local-uploads/` and served from
`/api/local-images/<id>`; `listing_images.storage_path` stores the same opaque
image ids. Files are only available on the machine running the dev server, so
switch to Cloudflare Images before deploying.

### Admin bootstrap

Admin roles live in `public.users.admin_role` (`super_admin` or `moderator`).
Promote the first account after it has signed in at least once:

```sql
update public.users
set admin_role = 'super_admin'
where lower(email) = lower('you@example.com');
```

Then sign in and open `/admin`. `super_admin` can grant `moderator` or
`super_admin` from `/admin/admins`. The app always refuses to remove the last
super admin.

## Environment

Credentials live in the project-root `.env` file (gitignored). Key groups:

- **Database:** `DATABASE_URL`, optional `DIRECT_URL` for CLI tooling.
- **NextAuth:** `AUTH_SECRET`, `AUTH_URL`.
- **Canonical URL:** `NEXT_PUBLIC_SITE_URL` (production must not be localhost).
- **Support:** `NEXT_PUBLIC_SUPPORT_EMAIL` (shown on help/privacy pages; required
  in production).
- **Email:** `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`,
  `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` (or a single `EMAIL_SERVER` URL).
- **Local images:** `PANTAKER_IMAGE_MODE=local`, `LOCAL_UPLOAD_DIR`,
  optional `LOCAL_UPLOAD_SECRET`.
- **Cloudflare Images:** `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_IMAGES_API_TOKEN`, `NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH`,
  optional `NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT`.

Secrets are server-only and must never be prefixed with `NEXT_PUBLIC_`.

## Authentication

NextAuth handles identity with a **passwordless email one-time code**. There are
no passwords. The code is a 6-digit number valid for 10 minutes. Sessions are
JWTs and are invalidated when an account's `session_version` changes (for
example, after an email change or suspension).

Routes:

- `/login` — single sign-in / sign-up page.
- `/auth/signout` — POST sign-out.
- `/seller/settings/account/confirm-email` — confirms a requested email change.

Email delivery uses SMTP (Gmail app passwords work). In production,
`EMAIL_SERVER_*` plus `EMAIL_FROM` are required.

## Main routes

- `/` — landing page and marketplace entry.
- `/marketplace` — browse/search; `/marketplace/listing/[id]` — listing detail.
- `/sell`, `/seller/*` — seller listings, messages, sales, settings.
- `/admin/*` — listing moderation, reports, accounts, categories, deletion
  requests, and admin roles (permission-gated; `noindex`).
- `/help`, `/privacy`, `/terms` — public support, privacy notice, and marketplace
  rules.

## Image uploads

Listing photos upload directly from the browser to Cloudflare Images via
`src/app/api/images/direct-upload/route.ts`. The route requires a signed-in,
writable account, rate-limits upload URLs per user per hour, and sanitizes
metadata before issuing a one-time upload URL. Removed listing images are cleaned
from Cloudflare only after their database rows are gone and the asset is no longer
referenced.

## Operational notes

- Production fails closed with `503` when required env vars are missing or
  `NEXT_PUBLIC_SITE_URL` points at localhost (see `src/lib/env.ts`).
- Account deletion removes domain data in a single Postgres transaction through
  `admin_delete_account_data()`, then removes unreferenced images.
- Messaging polls every few seconds while the tab is visible; it does not use
  Realtime or a browser database client.
- There are no fabricated metrics, sellers, or ratings. Sample data is only used
  when the marketplace is not configured.
