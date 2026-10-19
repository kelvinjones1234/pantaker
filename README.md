# PANTAKER — Landing Page

Shop.com-style marketplace landing page in Pantaker brand colors
(forest `#174D3B`, leaf `#2FA66A`, warm off-white `#F7F5EF`).
Launch market: **Abuja, FCT, Nigeria**.

## Quickstart

```bash
npm install
npm run dev   # http://localhost:3000
```

Without Supabase env vars the page runs on clearly-labelled sample data.
Copy `.env.example` to `.env.local` and add project keys to go live.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |

## Structure

- `src/app/page.tsx` — landing composition (Server Component, fetches items + categories)
- `src/components/marketplace/ShopLandingPage.tsx` — full landing UI (Client Component):
  announcement banner, desktop icon dock, mobile bottom nav, in-canvas header with
  district picker, omnibox search, trending chips, department slider, filterable
  listing feed, seller-type cards, honest stats, how-it-works
- `src/components/marketplace/ListingCard.tsx` — listing card + shared `CardListing` type
- `src/features/listings/` — `queries.ts` (sample data, or Supabase when configured),
  `actions.ts` (create listing, inquiry, report — preview-guarded)
- `src/components/brand/`, `src/components/ui/badge.tsx` — brand + design primitives

## Authentication

Supabase Auth handles identity — **Google OAuth** or a **passwordless email
one-time code**. There are no passwords. Prisma mirrors the signed-in user into a
`profiles` row for app data. Routes:

- `src/app/(auth)/login` — the single sign-in / sign-up page (Google or email code).
  `src/app/(auth)/signup` redirects here; the two are the same flow.
- `src/app/auth/callback` — PKCE code exchange for the Google OAuth redirect.
- `src/app/auth/signout` — POST sign-out.
- `src/features/auth/` — server actions (`requestEmailCodeAction`,
  `verifyEmailCodeAction`, Google, sign-out), queries, `ensureProfile` upsert.
- `src/lib/prisma.ts` — lazy Prisma client (driver adapter). `prisma/schema.prisma`
  owns the `Profile` model only.

### Enable it (Supabase dashboard)

1. **Auth → Providers → Email:** enable. New emails create an account on first
   verification automatically. Set the OTP expiry and rate limits as needed.
2. **Auth → Email Templates → Magic Link:** include the code placeholder so the
   email contains the 6-digit token, e.g. `Your Pantaker code is {{ .Token }}`.
   (A `{{ .ConfirmationURL }}` link is optional and unused by the app.)
3. **Auth → Providers → Google:** enable and paste a Google Cloud OAuth client
   (client id + secret). Authorized redirect URI is Supabase's
   `https://<project-ref>.supabase.co/auth/v1/callback`.
4. **Auth → URL Configuration:** add redirect URL
   `${NEXT_PUBLIC_SITE_URL}/auth/callback` (e.g. `http://localhost:3000/auth/callback`).
5. **Database:** set `DATABASE_URL` (pooler) and `DIRECT_URL` (direct host), then run
   `npm run db:push` to create the `profiles` table (or `npm run db:pull` if it
   already exists, then trim the schema to `Profile`).

## Image uploads (Cloudflare Images)

Listing photos upload directly from the browser to Cloudflare Images via
`src/app/api/images/direct-upload/route.ts` + `src/lib/cloudflare-images.ts`.
Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_IMAGES_API_TOKEN`,
`NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_HASH`, and (optionally)
`NEXT_PUBLIC_CLOUDFLARE_IMAGES_VARIANT`. Delivery serves from `imagedelivery.net`
(already allow-listed in `next.config.mjs`).

## Notes

- Only the landing page and the auth routes exist so far. In-page links to
  not-yet-rebuilt routes will 404 until those pages are added.
- No fabricated metrics, sellers, or ratings: stats and yard cards are derived from
  real props or framed as generic seller types.
