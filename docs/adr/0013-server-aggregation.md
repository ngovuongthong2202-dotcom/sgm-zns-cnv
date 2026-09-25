# ADR 0013: Server-side Aggregation Pattern (Phase 7D)

## Status
Accepted

## Context
As the number of Quotations, Contracts, and Payments grew, computing metrics (like Total Revenue, Conversion Rate, Health Score) on the client side caused heavy payload sizes, slow TTI (Time to Interactive), and exceeded our strict budget: "1 page load = ≤ 3000 Firestore document reads".

## Decision
Adopt a Server-side rollup and Materialized View pattern.
- The `MetricsRollupService` runs a cron job on the backend to aggregate statistics and write the result into lightweight "Materialized View" summary documents.
- The Dashboard (`useDashboardKpis`) only reads these summary documents instead of querying the transaction collections.

## Consequences
- Fast First Contentful Paint (< 1.5s as mandated).
- Read operations dropped by over 95% on the dashboard.
- Minimal backend compute as aggregations run incrementally on schedule.
