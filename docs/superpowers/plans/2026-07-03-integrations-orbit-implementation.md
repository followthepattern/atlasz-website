# Integrations Orbit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the integrations card grid with an atlasz-centered orbit layout that highlights Eurowag, Mobile CMS, and WebEye around the brand.

**Architecture:** Keep the work inside `src/components/Integrations.tsx` using static arrays for featured nodes. Reuse existing i18n keys and the existing inline icon pattern. Use responsive Tailwind classes: an absolute-positioned orbit stage on `md+`, and a stacked fallback on mobile.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, i18next/react-i18next.

## Global Constraints

- Center: an `atlasz` brand node, visually stronger than the surrounding items.
- Featured integrations: `Eurowag`, `Mobile CMS`, and `WebEye` as larger nodes around the center, each with icon, name, category, and short description.
- Connecting lines: subtle radial lines from the center to nodes, kept low-contrast so they add structure without visual clutter.
- Mobile should collapse to a clean stacked layout: atlasz center node first, then the three featured integrations.
- Keep English and Hungarian locale files structurally identical.

---

### Task 1: Orbit Layout Component Update

**Files:**
- Modify: `src/components/Integrations.tsx`

**Interfaces:**
- Consumes: existing translation keys `integrations.partners.*`, `integrations.eyebrow`, `integrations.heading`, `integrations.intro`.
- Produces: the exported `Integrations()` component with the same public interface and no new props.

- [x] **Step 1: Define node metadata**

Add static metadata for the three featured integrations:

```tsx
const FEATURED_PARTNERS = [
  { key: "eurowag", position: "left-[8%] top-[12%]", line: "left-[31%] top-[36%] h-[1px] w-[18%] -rotate-[24deg]" },
  { key: "mobilecms", position: "right-[6%] top-[16%]", line: "right-[30%] top-[37%] h-[1px] w-[19%] rotate-[22deg]" },
  { key: "webeye", position: "left-1/2 bottom-[8%] -translate-x-1/2", line: "left-1/2 top-[57%] h-[19%] w-[1px]" },
];
```

- [x] **Step 2: Replace grid with desktop orbit stage**

Create a stable-height `relative` stage with center atlasz node, connector lines, and featured partner nodes. Keep node card radii at `rounded-lg`.

- [x] **Step 3: Add mobile fallback**

Use `md:hidden` for a stacked mobile layout: atlasz node, then the three featured integrations.

- [x] **Step 4: Run build**

Run: `npm run build`
Expected: TypeScript and Vite build pass.

### Task 2: Layout Verification And PR Update

**Files:**
- Modify only if verification exposes layout issues: `src/components/Integrations.tsx`

**Interfaces:**
- Consumes: final rendered `Integrations` section.
- Produces: pushed branch update on `codex/hungarian-translation-polish`.

- [x] **Step 1: Run locale parity check**

Run the Node parity script used in prior work.
Expected: English and Hungarian key counts match; no interpolation mismatches.

- [x] **Step 2: Browser smoke test**

Run the local dev server and check `?lang=hu` and `?lang=en` at desktop and mobile widths for no horizontal overflow and no obvious integration-node overlap.

- [x] **Step 3: Commit and push**

Commit with:

```bash
git add src/components/Integrations.tsx docs/superpowers/plans/2026-07-03-integrations-orbit-implementation.md
git commit -m "Implement integrations orbit layout"
git push
```
