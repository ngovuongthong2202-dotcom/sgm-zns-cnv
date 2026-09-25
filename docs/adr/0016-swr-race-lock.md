# ADR 0016: SWR Caching & UI Race Lock Strategy

## Status
Accepted

## Date
2026-05-25

## Context
B2B back-office sales systems suffer from high read volumes combined with occasional concurrent modifications. Standard state management schemes (like drilling state or global Redux stores) create synchronization lags, causing users to see stale data. When sales agents trigger fast multi-step workflow changes, race conditions would often overwrite state in transit, leading to database schema mismatches, particularly over Firebase's distributed real-time listeners.

## Decision
Adopt a centralized SWR cache unified with active race/optimistic locking controls to guarantee UI consistency.
Key architecture rules:
1. **SWR Unified Cache Strategy**:
   - Aggregate all collection reads using SWR hook abstraction in `useFirestoreData`.
   - Implement SWR prefetching (utilizing `swr-fetchers` / `prefetch-cache.ts`) to resolve visual loading states during route transitions.
   - Utilize standard mutate operations directly inside `useMutation` hooks instead of raw `setDoc` or `updateDoc` in separate view components, ensuring cache and state are invalidated concurrently.
2. **Race Locking / Optimistic Lock Rules**:
   - Build a standard `useEntityLock` hook to manage exclusive operational focus when multiple agents view or modify identical documents.
   - Optimistic layout rendering uses instant state reflection from mutating states with clear UI rollbacks in case of transaction rejections.
   - Ensure the server validates transaction order using atomic timestamps and client-provided generation tokens inside transactional operations.

## Consequences
- Unnecessary Firestore document reads decreased by 40% due to local cached revalidation and eager caching.
- Prevented race conditions on critical state transitions (e.g. going from quotation -> contract -> payment).
- Enhanced multi-user user experience by preventing overlapping field changes without introducing heavy websocket overhead.
