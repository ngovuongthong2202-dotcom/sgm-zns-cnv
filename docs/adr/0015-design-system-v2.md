# ADR 0015: Design System v2 (Polished Linear/Notion/Vercel Hybrid)

## Status
Accepted

## Date
2026-05-25

## Context
To build a premium enterprise SaaS experience for B2B sales operations, our visual design had to escape standard component-library defaults. We needed a highly cohesive, typographic-centric design system featuring generous negative space, sophisticated borders, precise light-mode surface contrasts, and subtle transitions, while eliminating visual clutter. This also dictates a strict color accent policy, banning purple hues and standard gradients in favor of high-credibility cool grays and purposeful semantic tokens.

## Decision
Establish the **Design System v2** framework built on React 19, Tailwind CSS, and Radix UI primitives.
Key specifications include:
1. **Strict Hex Palette Rules**:
   - Primary: Slate-900 (neutral display & text), White/Slate-50 (surfaces).
   - Accent: Blue-600 (default high-contrast accent). Supporting cyan-600/teal-600/organic emerald-600 for positive elements and amber-600 for warnings.
   - Prohibited Colors: **CẤM** `purple`, `violet`, `indigo`, `fuchsia`, `pink`, `magenta` across all elements (UI, text, icons, charts, gradients).
2. **Component Density Matrix**:
   - Compact: 32px standard element heights (menus, bars).
   - Cozy: 40px element heights.
   - Comfortable: 48px element heights. Responsive toggle globally mounted at the workspace header.
3. **Container Metrics & Grid**:
   - Grid padding: `p-6` on desktop, `p-4` on mobile devices.
   - Cards are containerized with: `bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]`. No excessive shadow layers.
   - Action buttons are strictly formatted at `h-9 px-3.5 rounded-lg text-sm font-medium`.
4. **Motion Directives**:
   - Standard transitions use smooth fade-in effects over 120ms to 200ms duration.
   - Scale animations are capped at maximum `1.02` to avoid hover-flickering, avoiding bouncy/elastic curves.

## Consequences
- The application visual hierarchy achieved high professional credibility, resembling design systems from Linear and Vercel.
- Front-end developers have simple tailwind-tokens to maintain layout consistency.
- Standardized UI layout prevents semantic visual clutter and enhances reading speed.
