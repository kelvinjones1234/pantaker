# PANTAKER

A circular-economy marketplace for unwanted items, scrap, and recoverable
materials. Launch market: **Abuja, FCT, Nigeria**.

Pantaker is a Next.js app backed by PostgreSQL, Prisma, NextAuth, and Cloudflare
R2 for listing photos and avatars. Fixed-price listings can be bought with
buyer-protected payments through Bachs: Pantaker holds the seller’s share
until handover, then pays out after 72 hours (or sooner when the buyer confirms
receipt). Sellers can still record off-platform sales directly.

## Quickstart

```bash
npm install
# fill in the values in .env, then start the app
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
| `npm run r2:check` | Verify Cloudflare R2 credentials |
| `npm run images:migrate` | Migrate legacy listing/profile images to R2 |
| `npm run images:cleanup` | Find or delete unreferenced uploaded images |

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
| `0013_listing_area_index.sql` | Listing area index |
| `0014_payments.sql` | Orders, payments, transfers, refunds, disputes, payouts |
| `0015_password_auth.sql` | Password hashes and login OTPs |
| `0016_seller_contact.sql` | Seller contact fields |
| `0017_payment_completion.sql` | Order notifications and the order-update preference |
| `0018_webhook_reconciliation.sql` | Dispute event ordering and transfer reconciliation indexes |

Set `DATABASE_URL` (session pooler) and `DIRECT_URL` (direct host) for Prisma CLI
commands. Database access is owner-level through Prisma; the browser never talks
to Postgres directly. Migrations must be applied with a role that can alter the
schema.

## Cloudflare R2

Listing photos and avatars are stored in Cloudflare R2. R2 is required in
production: the middleware returns `503` if the credentials are missing, and
`PANTAKER_IMAGE_MODE=local` is rejected outside development.

1. Create an R2 bucket.
2. Create an R2 API token with **Object Read & Write** permission for that
   bucket, then copy its Access Key ID and Secret Access Key.
3. Copy the S3 endpoint: `https://<account-id>.r2.cloudflarestorage.com`.
4. Enable public access through the bucket's `r2.dev` URL or a custom domain.
5. Add the values to `.env`:

```dotenv
PANTAKER_IMAGE_MODE=r2
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
NEXT_PUBLIC_R2_PUBLIC_DOMAIN=https://<public-bucket-domain>
```

The access key and secret are server-only; never prefix them with
`NEXT_PUBLIC_`. `NEXT_PUBLIC_R2_PUBLIC_DOMAIN` must be available at build time so
Next.js can allow the image host. Uploads are proxied through the Next.js server,
so R2 does not need browser CORS rules for uploads.

Verify write, delete, and public read access before uploading (the check creates
and removes a temporary `healthcheck/` object):

```bash
npm run r2:check
```

The browser uploads to `/api/images/upload`, which authenticates the account,
checks listing ownership, validates and converts the image with `sharp`, and
writes it to R2. Only the object key is stored in Postgres. Public delivery uses
`https://<public-bucket-domain>/<object-key>`.

Object keys are scoped by owner:

- `listings/<user-id>/<uuid>.webp`
- `profiles/<user-id>/<uuid>.webp`
- `migrated/listings/<listing-id>/<sha256>.webp`
- `migrated/profiles/<user-id>/<sha256>.webp`

The server accepts images up to 10 MB and converts them to WebP. On Vercel,
serverless request bodies are capped at about 4.5 MB; lower the configured limit
or deploy the route on infrastructure that accepts larger request bodies.

If `npm run r2:check` reports that S3 works but public delivery returns `404`,
enable **Public Access** for the bucket in the Cloudflare dashboard (or connect a
custom domain) and make sure `NEXT_PUBLIC_R2_PUBLIC_DOMAIN` points at that exact
public host.

Existing `local-*` image IDs from development are not valid R2 objects;
re-upload those photos after switching modes. Legacy Cloudflare Images IDs and
`media/` objects remain readable. `NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH`
is optional and only needed to render legacy Cloudflare Images IDs or migrate
them.

## Local image storage (development only)

For local development you can store listing and avatar photos on disk instead of
configuring R2:

```dotenv
PANTAKER_IMAGE_MODE=local
LOCAL_UPLOAD_DIR=.local-uploads
```

Uploads are written to `.local-uploads/` and served from
`/api/local-images/<id>`; `listing_images.storage_path` stores the local image
id. Files are only available on the machine running the dev server, so switch to
R2 before deploying. Local image mode is rejected in production.

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
- **Pickup codes:** `PICKUP_CODE_SECRET` (required in production; use a value
  different from `AUTH_SECRET`. Local development falls back to `AUTH_SECRET`).
- **Canonical URL:** `NEXT_PUBLIC_SITE_URL` (production must not be localhost).
- **Support:** `NEXT_PUBLIC_SUPPORT_EMAIL` (shown on help/privacy pages; required
  in production).
- **Email:** `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`,
  `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` (or a single `EMAIL_SERVER` URL).
- **Cloudflare R2 (required in production):** `CLOUDFLARE_R2_BUCKET`,
  `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`,
  `CLOUDFLARE_R2_BUCKET_ENDPOINT`, `NEXT_PUBLIC_R2_PUBLIC_DOMAIN`.
- **Local images (development only):** `PANTAKER_IMAGE_MODE=local`,
  `LOCAL_UPLOAD_DIR`.
- **Legacy images (optional):** `NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH`.
- **Payments (required in production):** `BACHS_SECRET_KEY`,
  `BACHS_WEBHOOK_SECRET`, optional `BACHS_API_BASE_URL`.
- **Scheduled jobs (required in production):** `CRON_SECRET`.

Secrets are server-only and must never be prefixed with `NEXT_PUBLIC_`.

## Payments (Bachs)

Fixed-price listings use Bachs hosted checkout. The flow is:

1. The buyer opens checkout. Pantaker creates an `orders` row and a pending
   `order_payments` row, then a Bachs checkout session.
2. `collection.succeeded` marks the order paid and holds the seller’s share.
3. The seller marks the item ready, the buyer shows their pickup code, and the
   seller confirms handover.
4. The buyer confirms receipt, or 72 hours pass, then Pantaker creates a transfer
   to the seller’s Bachs account. If the create response is `pending`, the cron
   reconciles the transfer with Bachs before marking the order released.
5. Refunds and disputes are recorded against the order. A lost dispute or a
   refund is recovered from the seller’s balance where possible; recovery runs
   from the cron so a slow Bachs call cannot block the webhook response.

Webhook endpoint: `/api/webhooks/bachs`. Signature verification uses
`BACHS_WEBHOOK_SECRET`; events are stored in `bachs_webhook_events` with the
provider timestamp, and duplicate deliveries are ignored. In the Bachs dashboard
the endpoint must use `event_source = all` (or `connect`) and subscribe to every
handled family: `collection.*`, `checkout.expired`, `refund.*`, `dispute.*`,
`transfer.created`, `payout.*`, and `account.updated` / `capability.updated`.
Dispute events carry `created_at`; older deliveries are ignored so a late
webhook cannot overwrite a newer resolution.

### Scheduled jobs

`/api/cron/orders` expires stale checkouts, releases seller transfers that are
due, reconciles transfers that Bachs left `pending`, and starts recovery
transfers for refunded orders. It requires `Authorization: Bearer $CRON_SECRET`. `vercel.json` schedules
it every five minutes on Vercel; minute-level Vercel Cron needs a plan that
allows it, so on Hobby or another host point any scheduler at the same endpoint
with that header. Without a scheduler, stale checkouts stay open and seller
payouts wait until a buyer confirms receipt.

## Authentication

NextAuth handles identity with **email + password**. Sign-up also verifies the
address with a 6-digit one-time code valid for 10 minutes, then stores a scrypt
password hash; sign-in uses only the email and password. Sessions are JWTs and
are invalidated when an account's `session_version` changes (for example, after
an email change or suspension).

Routes:

- `/login` — email + password sign-in.
- `/signup` — create an account and confirm the email with a one-time code.
- `/auth/signout` — POST sign-out.
- `/seller/settings/account/confirm-email` — confirms a requested email change.

Email delivery uses SMTP (Gmail app passwords work). In production,
`EMAIL_SERVER_*` plus `EMAIL_FROM` are required.

## Main routes

- `/` — landing page and marketplace entry.
- `/marketplace` — browse/search; `/marketplace/listing/[id]` — listing detail.
- `/sell`, `/seller/*` — seller listings, messages, sales, orders, settings.
- `/checkout/[listing-id]`, `/orders`, `/orders/[id]` — protected checkout and
  buyer orders.
- `/admin/*` — listing moderation, reports, orders, accounts, categories,
  deletion requests, and admin roles (permission-gated; `noindex`).
- `/api/webhooks/bachs` — signed Bachs webhooks; `/api/cron/orders` — expiry,
  payout retries, transfer reconciliation, and refund recovery.
- `/help`, `/privacy`, `/terms` — public support, privacy notice, and marketplace
  rules.

## Image uploads

Listing photos and avatars upload to `src/app/api/images/upload/route.ts`. The
route requires a signed-in, writable account, rate-limits uploads per user per
hour, validates ownership of the listing, checks the declared and actual image
type, and converts the image to WebP before storing it. The delete route at
`src/app/api/images/route.ts` only removes an object when the caller owns its
prefix and no database row references it. Removed listing images are cleaned
from R2/local storage only after their database rows are gone and the object is
no longer referenced.

### Migrating legacy images

Dry-run first, then migrate in batches:

```bash
npm run images:migrate -- --dry-run
npm run images:migrate -- --type listing --limit 50
npm run images:migrate -- --type profile --limit 50
```

The script reads `DATABASE_URL`/`DIRECT_URL`, downloads legacy `media/`, local, or
Cloudflare Images references, converts them to WebP, uploads deterministic
`migrated/` keys, and updates the row only after the object exists. Re-run with
the same flags to continue. Existing `storage_path`/`avatar_path` values are
left in place until their replacement upload succeeds.

### Cleaning abandoned uploads

Uploads that are removed before saving are deleted by the browser. To find
objects left behind by closed tabs or interrupted requests, run the dry-run
cleanup, then apply it:

```bash
npm run images:cleanup -- --min-age-hours 24
npm run images:cleanup -- --min-age-hours 24 --apply
```

The script only considers `listings/`, `profiles/`, and `migrated/` objects older
than the age threshold and refuses to delete any key still referenced by a
listing image, profile avatar, or category icon. Schedule the `--apply` command
to run daily with the same R2 and database credentials as the app.

## Operational notes

- Production fails closed with `503` when required env vars (including
  Cloudflare R2) are missing, `NEXT_PUBLIC_SITE_URL` points at localhost, or
  local image mode is enabled (see `src/lib/env.ts`).
- Account deletion removes domain data in a single Postgres transaction through
  `admin_delete_account_data()`, then removes unreferenced images.
- Messaging polls every few seconds while the tab is visible; it does not use
  Realtime or a browser database client.
- There are no fabricated metrics, sellers, or ratings. Sample data is only used
  when the marketplace is not configured.
# pantaker
