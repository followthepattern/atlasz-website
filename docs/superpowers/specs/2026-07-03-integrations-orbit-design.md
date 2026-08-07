# Integrations Orbit Design

## Goal

Reshape the integrations section so atlasz is the visual center of the ecosystem. The page should communicate that existing tools connect into atlasz, with the three most important integrations highlighted around the brand.

## Layout

The section keeps the current heading and intro copy. Below it, replace the partner-card grid and category-chip row with an orbit-style composition:

- Center: an `atlasz` brand node, visually stronger than the surrounding items.
- Featured integrations: `Eurowag`, `Mobile CMS`, and `WebEye` as larger nodes around the center, each with icon, name, category, and short description.
- Connecting lines: subtle radial lines from the center to nodes, kept low-contrast so they add structure without visual clutter.

## Responsive Behavior

Desktop and tablet should use the orbit composition with fixed relative positions inside a stable-height stage. The layout must avoid overlap at the existing max content width.

Mobile should collapse to a clean stacked layout: atlasz center node first, then the three featured integrations. Text must remain readable and must not overflow.

## Data And I18n

Reuse the existing `integrations.partners.*` translation keys. Add only minimal keys if the center node needs a label or accessible text. Keep English and Hungarian locale files structurally identical.

## Testing

Verify with:

- `npm run build`
- locale parity check for English and Hungarian JSON keys/interpolation variables
- browser smoke check at desktop and mobile widths for Hungarian and English, focused on layout overlap and horizontal overflow
