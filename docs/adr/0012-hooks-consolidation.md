# ADR 0012: Data Fetching & Hooks Consolidation (Phase 7C)

## Status
Accepted

## Context
Our features (Quotations, Contracts, Deliveries, Payments) were using duplicated data fetching logic. This led to fragmented loading states, inconsistent error handling, and performance bottlenecks as each feature hook re-invented data aggregation logic for the DataView Engine.

## Decision
We consolidate custom hooks into a unified, predictable structure.
- All collection operations are managed via the standard Firebase Data access pattern.
- Implemented `useFirestoreData` and specific feature hooks (e.g., `useQuotations`, `useContracts`) that rely on highly optimized queries.
- We enforce strict typings using Zod schemas via `zod-field-extractor.ts`.

## Consequences
- Significant reduction in frontend bundles and boilerplate code.
- Reduced Firestore Read budget via better local caching and unified state contexts.
- Easier to maintain as the data access layer represents a Single Source of Truth.
