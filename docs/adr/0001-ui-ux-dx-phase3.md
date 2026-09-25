# ADR 0001: Phase 3 - UI/UX & Developer Experience Refactoring

## Context
As the application scales, the monolithic structure in `src/pages` has become difficult to maintain (files > 500 LOC). 
UI components are scattered and inconsistent, without a single source of truth for design tokens. 
Additionally, CI/CD and DX tools like strict environment validation, pre-commit hooks, and code splitting are missing.

## Decision
1. **Folder Rework**: Adopt a Feature-based architecture (`src/features/<domain>/`). Each domain contains `page.tsx` (compose only), `components/`, `hooks/`, `api/`, and `types.ts`.
2. **Design System**: Centralize UI primitives in `src/design-system/` accessible via `@/ds/*`. Base them on Tailwind and structured tokens (`tokens.ts`). Extract `StatusPill`, `Button`, etc.
3. **Code Splitting**: Utilize `React.lazy` for route-level splitting and `Vite` manual chunks for `vendor`, `firebase`, and `motion`.
4. **DX Enhancements**:
   - Establish `.github/workflows/ci.yml` for automated CI.
   - Enforce environment variable validation on startup using Zod (`config/env.config.ts`).
   - Add documentation via `README.md` and `docs/adr/`.

## Consequences
- **Pros**: Improved code navigability, consistent UI via the Design System, smaller bundle sizes on initial load, and safer deployments via CI and env checks.
- **Cons**: Initial learning curve for the new folder structure. Cross-feature dependencies must be managed carefully to avoid coupling.

## Migration Strategy
We will incrementally migrate pages to the `features/` directory starting with `QuotationsPage` as the proof of concept. Routing remains unchanged for the end user.
