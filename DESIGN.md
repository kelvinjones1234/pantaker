# Shop — Style Reference
> Floating shopping constellation on white marble

**Theme:** light

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Shop runs on a white-canvas discovery model where products float as large, heavily-rounded image cards instead of grid-locked thumbnails. The entire interface is pillow-soft: 20–28px radii everywhere, pill-shaped controls, a compact 16px GT Standard body with tight negative tracking that pulls text into crisp shapes. A single vivid violet (#5433eb) is the system's only saturated accent — it appears in the wordmark, the circular search submit, and as a tinted shadow on that same button. The rest of the palette is warm-neutral: white surfaces, a faint cool-gray canvas, hairline borders, and near-black text. Density stays compact with 12px gaps, but the hero and category bands breathe through generous 64–80px vertical rhythm, making commerce feel browsable rather than catalog-like.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas Mist | `#f2f4f5` | `--color-canvas-mist` | Page background and secondary surface wash behind elevated cards |
| Pure White | `#ffffff` | `--color-pure-white` | Primary surface for cards, input fields, floating brand spotlights, and pill buttons |
| Ink Black | `#000000` | `--color-ink-black` | Primary text, headings, icons, nav symbols, and dark mode product cards |
| Faint Border | `#ebebeb` | `--color-faint-border` | Hairline dividers on cards, input outlines, and pill button borders |
| Muted Gray | `#787574` | `--color-muted-gray` | Secondary text, navigation labels, icon strokes in idle state |
| Cool Stone | `#cccccc` | `--color-cool-stone` | Placeholder fills, disabled states, and inactive icon backgrounds |
| Warm Fog | `#acb0aa` | `--color-warm-fog` | Subtle surface tints for secondary product cards and section backgrounds |
| Shop Violet | `#5433eb` | `--color-shop-violet` | Search submit button, wordmark dot, brand logo — the single accent that makes action and identity pop against the white canvas |
| Violet Wash | `#c0b5f3` | `--color-violet-wash` | Translucent halo behind the violet submit button, extending its glow without changing hue |
| Slate Ink | `#332f2d` | `--color-slate-ink` | Dark product card surfaces and deep-tone overlay text |
| Ash Veil | `#665a54` | `--color-ash-veil` | Warm desaturated gray used in product imagery backdrops, not an active UI token |

## Tokens — Typography

### GT Standard — Primary typeface at all sizes (`--font-gt-standard`)
- **Substitute:** Inter, system-ui, -apple-system
- **Weights:** 400
- **Sizes:** 9px, 11px, 12px, 14px, 16px, 20px
- **Line height:** 1.10–1.38
- **Letter spacing:** -0.05em at 20px, -0.031em at 16px, -0.014em at 14px, -0.017em at 12px, -0.058em at 9px

### Shopify Sans — System-level messaging (`--font-shopify-sans`)
- **Substitute:** Inter · **Weights:** 400, 700 · **Sizes:** 10px, 14px

### Type Scale

| Role | Size | Line Height | Token |
|------|------|-------------|-------|
| caption | 11px | 1.33 | `--text-caption` |
| body-sm | 12px | 1.33 | `--text-body-sm` |
| body | 14px | 1.33 | `--text-body` |
| body-lg | 16px | 1.33 | `--text-body-lg` |

## Tokens — Spacing & Shapes

**Density:** compact · **Page max-width:** 1200px · **Section gap:** 64px · **Element gap:** 12px

**Radius:** cards 28px · chips 9999px · pills 20px · inputs/search/buttons 9999px

**Shadows:** sm `rgba(0,0,0,0.06) 0px 2px 8px 0px` · sm-2 dual-layer card shadow · lg `rgba(0,0,0,0.12) 0px 4px 24px 0px` · lg-2 violet-tinted `rgba(69,36,219,0.34) 0px 4px 24px 0px`

## Components

- **Hero Floating Product Card:** white, 28px radius, dual-layer shadow; 1:1 image at 20px inner radius; 14px semibold brand name; 9px rating row; zero card padding.
- **Brand Spotlight Card:** white, 28px, dual shadow; image upper, brand + rating below; no border.
- **Search Input with Violet Submit:** 9999px pill, white, 1px `rgba(5,41,77,0.1)` border, `4px / 20px` padding; 48px circular violet submit with white arrow; violet-tinted shadow; 16px muted placeholder.
- **Category Pill:** 9999px, white, 1px `#ebebeb` border, sm shadow; 16px circular icon + 16px label; `6px` padding.
- **Category Section Header:** 20px semibold, -1px tracking, ink-black + 16px chevron; 24px margin before grid.
- **Sidebar Nav Rail:** ~64px white rail, no border; 24px icons in 48px targets; active = `#f2f4f5` fill at 20px radius; 32px avatar with `#ebebeb` ring.
- **App Download Banner:** full-width black band, 48px height, white centered text, 24px icon, 14px label + 10px subtext + arrow.
- **Cookie Consent Button:** 9999px pill, white, `#ebebeb` border, 12px semibold black label, `6px/16px` padding, sm shadow.
- **Category Carousel Arrow:** 32px white circle, lg shadow, 16px chevron, right edge of rails.
- **Product Type Hero Image:** 28px rounded full-bleed image, white display type top-left + rating row; image IS the card.
- **Mini Thumbnail Strip:** 48px squares at 12px radius, 2px gaps.

## Do's and Don'ts

Do: 28px cards + 9999px pills/inputs/chips; violet only on submit + wordmark dot; 16px body with tight tracking (12px floor); dual-layer shadows; shadow-only separation; 64–80px section rhythm; violet-tinted submit shadow.
Don't: second accent; sharp corners; 700+ weights; card borders; colored UI containers; breaking pill convention; body below 12px; gradients/illustrations/decorative shapes.

## Surfaces & Elevation

Canvas `#f2f4f5` → surface `#ffffff` → elevated card `#ffffff` + dual shadow → dark product image `#000000` with white overlay text.

## Imagery

Full-bleed photography on white, 1:1 crops, warm earth-tone palettes. UI stays achromatic; product hues provide variety. No illustrations, 3D, or gradients on imagery. Icons mono ink-black outline (category pills excepted).

## Layout

Max-width 1200px on `#f2f4f5`; 64px icon-only rail; hero band with floating cards above centered violet wordmark + pill search; centered category pills; labeled 4-column bands; dark footer band with link columns; rail arrows, no dots.

## Pantaker application notes (binding)

- Accent in code is `--color-shop-violet: #5433eb` (wordmark dot, search submit, primary fills, tinted glow). No green is used anywhere on the landing surface.
- GT Standard / Shopify Sans / Playfair Display load via `next/font/google` with system fallbacks; Inter is the at-runtime substitute.
- All landing content is real: sample listings, live Supabase rows when configured, computed counts. Never render fabricated sellers, ratings, review counts, or metrics.
