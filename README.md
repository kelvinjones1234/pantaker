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
  `actions.ts` (save-to-favorites, preview-guarded)
- `src/components/brand/`, `src/components/ui/badge.tsx` — brand + design primitives

## Notes

- Only this landing page exists — former marketplace, auth, dashboard, admin, and
  marketing routes were removed. In-page links pointing at those routes will 404
  until the corresponding pages are rebuilt.
- No fabricated metrics, sellers, or ratings: stats and yard cards are derived from
  real props or framed as generic seller types.
