# Pantaker — Agent Rules (auto-loaded every conversation)

## Design authority

`DESIGN.md` is the ultimate source of truth for all UI work. It overrides every
installed design tool on conflict. Re-read its Tokens, Components, and Do's and
Don'ts before generating or editing any interface.

## Anti-slop toolchain (installed project-scope under `.opencode/skills/`)

Partition strictly — do not let one tool do another's job:

- **Taste** (`.opencode/skills/design-taste-frontend`, skill `design-taste-frontend`):
  structural layout only. Run its pre-flight check, deal directions with
  `scripts/draw.mjs`, keep layout variance. Re-skin all Taste styling onto
  DESIGN.md tokens before shipping. Trigger: any new/changed page section, hero,
  or layout the user calls generic, templated, or AI-made.
- **UI/UX Pro Max** (`.opencode/skills/ui-ux-pro-max`): token/checklist mapping only.
  Query with `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "<surface>"
  --design-system -p "Pantaker"`, then remap every returned color/font/effect onto
  DESIGN.md tokens; discard any suggested style or second accent. Apply its
  pre-delivery checklist (SVG icons, pointer cursors, hover 150–300ms, 4.5:1
  contrast) in full. Trigger: component builds, palette/type questions, UX reviews.
- **Impeccable** (`.opencode/skills/impeccable`, skill `impeccable`): audits and
  mutations only — never greenfield direction. Run
  `npx impeccable detect <touched-files>` and resolve primary findings before
  marking UI work done. `/polish` on request; `/bolder` / `/quieter` only when
  explicitly asked. Trigger: after any UI edit, before declaring UI work complete.

## Hard bans (refuse regardless of tool output)

No second accent; no green on the landing surface; no gradients (especially violet
or cyan); no card borders; no sharp corners on cards/pills/inputs; no body text
below 12px; no gradient heading text; no side-tab accent borders; no nested cards;
no emoji as icons; no placeholder copy or fabricated sellers/ratings/metrics.

## Full protocol

See `DESIGN.md` → "Anti-Slop System Guardrails (binding)" for the mandatory
4-step workflow (Constrain → Structure → Map → Audit).
