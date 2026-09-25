# ADR 0014: Soft Gate Policy (Phase 7E)

## Status
Accepted

## Context
Previously, strict gate policy restrictions caused rigid business flows. If an invoice or delivery document was slightly misaligned with contract specs, the system would lock it completely, preventing sales agents from closing deals in real-world scenarios where flexibility is needed (with oversight).

## Decision
Introduce `Soft Gate Policy` in our State Machine (`gate.policy.ts`).
- We allow documents to bypass certain strict checkpoints by flagging them as "exception" rather than blocking the transition.
- Soft gate failures trigger auditing warnings `EntityAuditLogs` rather than hard stops.
- Hard gates are preserved solely for critical compliance steps (e.g., verifying Payment matches Quotation value).

## Consequences
- Operations became unblocked, improving UX and user satisfaction.
- We maintain business compliance via robust audit logging.
- `EntityStatusService` is preserved as the single source of truth for flow progression.
