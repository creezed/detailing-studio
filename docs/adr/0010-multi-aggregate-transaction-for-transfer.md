# ADR-0010: Multi-Aggregate Transaction for Transfer

**Status:** Accepted  
**Date:** 2026-05-10  
**Context:** Inventory bounded context — Transfer posting

## Problem

When a Transfer is posted, stock must be decremented at the source branch (`transferOut`) and incremented at the destination branch (`transferIn`). These are two separate `Stock` aggregates.

Our architectural rule is "one aggregate = one transaction" (see `AGENTS.md` § 1.4). If we split this into two transactions connected by a domain event, there is a window where:

1. `transferOut` succeeds and stock is decremented at the source.
2. The event is published but `transferIn` has not yet executed.
3. During this window, the system-wide total quantity for the SKU is incorrect (stock is "lost").
4. If `transferIn` fails permanently, manual reconciliation is required.

## Decision

**We allow a single multi-aggregate transaction for Transfer posting.** The `ApplyTransferSaga` saves both `fromStock` and `toStock` within the same handler invocation, relying on the infrastructure layer to wrap them in a single database transaction.

This preserves the `totalSystemQuantity` invariant: the sum of all stock across branches for a given SKU never changes during a transfer.

## Consequences

- **Positive:** Atomic guarantee that stock is never "lost" between branches.
- **Positive:** Simpler error handling — no compensating transactions needed.
- **Negative:** Explicit exception to the one-aggregate-per-transaction rule; must be documented and limited to this use case only.
- **Negative:** Both Stock aggregates must reside in the same database (no cross-shard transfers).

## Monitoring

- The saga is idempotent via `IIdempotencyPort` — safe to retry on transient failures.
- If the saga fails, the Transfer remains POSTED but stock is not adjusted; the outbox will retry delivery.
- Alert on `transfer:*` idempotency keys that remain unprocessed for > 5 minutes.

## Alternatives Considered

1. **Saga with compensation:** `transferOut` first, then event-driven `transferIn`. Rejected because the intermediate state violates the totalSystemQuantity invariant and compensation logic is complex.
2. **Reserve pattern:** Create a "pending transfer" batch. Rejected as over-engineering for an in-process operation within a single database.
