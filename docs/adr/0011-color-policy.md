# ADR 0011: Strict Color & Typography Policy (Phase 7B)

## Status
Accepted

## Context
Across different phases of development, multiple developers introduced fragmented color tokens. We saw inconsistencies where "purple", "violet", "fuchsia", "pink", "rose", "magenta", and "indigo" were used, drifting away from our core brand identity.

## Decision
We establish a **STRICT PALETTE** and explicitly ban off-brand colors.
- **Allowed Palette**: `blue`, `sky`, `cyan`, `teal`, `emerald` (success), `amber` (warning), `orange`, `red` (danger), and neutral `slate`. The primary accent color is Action Blue (`#2563EB`).
- **Banned Colors**: `purple`, `violet`, `fuchsia`, `pink`, `rose`, `magenta`, `indigo`.
- **Typography Policy**: We rely on Inter as the primary sans-serif font.
- We enforce this via a custom script (`sweep-forbidden-colors.cjs`), ESLint rules, and pre-commit hooks to ensure regressions do not occur.

## Consequences
- Uniform, polished, and professional UI ("Apple/Linear-grade").
- Any attempt to use banned color utility classes via Tailwind will be flagged during CI/CD.
- Devs must refer to `src/design-system/tokens.ts` for semantic color usage.
