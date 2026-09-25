# ADR 0017: Transactional Integrity & Idempotency v2

## Status
Accepted

## Date
2026-05-25

## Context
B2B transactions such as contract generation, payment disbursements, and Zalo Notification Service (ZNS) message dispatching must execute exactly once. Unintentional double payment submissions due to network retries or misbehaving buttons would result in severe financial reporting discrepancies. Inbound notifications from Telegram and webhook callbacks from ZNS vendors (which may retry multiple times on errors) also require strict deduplication and state progression safeguards.

## Decision
Implement a multi-tier transactional integrity and idempotency protection model.
1. **Idempotent Outbound Actions**:
   - Secure critical mutations with unique, client-generated request correlation tokens (`correlationId`).
   - Before executing state machine movements (e.g. `customer.machine.ts`, `payment.machine.ts`), verify the requested operation is not a duplicate.
2. **Server-Side Integration Defenses**:
   - Webhook processing in `vendor-webhook.handler.ts` maintains a transaction log in Firestore. Incoming payloads are compared against historically processed transaction identifiers. If matched, the handler instantly returns a fast OK (200) without running duplicate logic.
   - Guard payment confirmations inside transaction steps checking state constraints explicitly, leveraging Firebase Firestore transactions.
3. **No Bad Button Rules**:
   - Form buttons that trigger writes are disabled immediately upon click (`isSubmitting` flag) and are assigned explicit disabled styles to prevent multiple clicks.

## Consequences
- Zero duplicate payout submissions or redundant ZNS dispatches were recorded.
- Webhook endpoints became resilient against distributed network retries.
- High-level data consistency is maintained even under poor connectivity conditions.
