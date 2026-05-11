# ADR-0015: WorkOrder Closing Two-Phase Commit Strategy

**Status:** Accepted  
**Date:** 2026-05-12  
**Context:** WorkOrder L.5 — CloseWorkOrderCommand with compensating saga

## Context

Closing a `WorkOrder` involves two distributed resources:

1. **WorkOrder aggregate** — persisted in the work-order database with outbox.
2. **Inventory stock movements** — each `ConsumptionLine` triggers a `consume()` call to `INVENTORY_STOCK_PORT`, which opens its own transaction in the Inventory bounded context.

These cannot be wrapped in a single database transaction because they belong to different bounded contexts with separate persistence stores (even if they share the same PostgreSQL instance today, that is an implementation detail).

The core problem: if we commit inventory movements first and then fail to persist the WorkOrder as CLOSED, the consumed stock is lost without a corresponding closed work order.

## Decision

**Variant A: Save WorkOrder as CLOSING first, then consume, then finalize.**

### Flow

```
1. Load WorkOrder, validate (ClosingValidator).
2. workOrder.startClosing(now, validator)  →  status = CLOSING
3. repository.save(workOrder)              →  commit CLOSING + WorkOrderClosingStarted event
4. For each ConsumptionLine:
     INVENTORY_STOCK_PORT.consume(...)     →  each in its own Inventory transaction
5. If all consume() succeed:
     workOrder.finalizeClose(now)           →  status = CLOSED
     repository.save(workOrder)            →  commit CLOSED + WorkOrderClosed event
6. If any consume() fails (InsufficientStock):
     Compensate already-consumed lines (reverse order)
     workOrder.revertClosing(reason, now)  →  status = IN_PROGRESS
     repository.save(workOrder)            →  commit revert + WorkOrderClosingReverted event
     Return error to caller
```

### State Machine Extension

```
AWAITING_REVIEW → CLOSING → CLOSED
                         ↘ IN_PROGRESS  (revert on failure)
IN_PROGRESS    → CLOSING → CLOSED
                         ↘ IN_PROGRESS  (revert on failure)
```

## Rationale

### Why Variant A over Variant B (consume first, then save)?

| Criteria | Variant A (CLOSING first) | Variant B (consume first) |
|----------|---------------------------|---------------------------|
| **Observability** | CLOSING status visible in DB — easy to monitor stuck closings | No intermediate status; if crash between consume and save, orphaned movements are invisible |
| **Recovery** | Background job detects CLOSING > 5 min → alert or auto-compensate | Must scan Inventory for movements without matching CLOSED WorkOrder |
| **Retry** | Clear: if CLOSING in DB but no CLOSED, re-run consume or compensate | Unclear: were movements already committed? Need idempotency keys everywhere |
| **Causality** | Natural: "I intend to close" → "do side effects" → "confirm" | Backwards: side effects before intent is recorded |

### Trade-offs

- **Extra status in state machine.** CLOSING adds complexity but is justified by the distributed nature of the operation.
- **Two extra saves.** CLOSING requires `save()` before consume and after finalize/revert. Acceptable for a low-frequency operation (closings happen once per work order).
- **Compensation complexity.** If consume fails mid-way, we must reverse already-consumed lines. Each `compensate()` call uses an idempotency key derived from the original consume key.

## Monitoring

- **Alert:** WorkOrders in CLOSING status for more than 5 minutes.
- **Metric:** `work_order_closing_duration_seconds` histogram.
- **DLQ:** If `finalizeClose` save fails after successful consumes, log to Sentry with full context for manual resolution.

## Consequences

- `WorkOrderStatus` enum gains `CLOSING` value.
- State transitions: `AWAITING_REVIEW|IN_PROGRESS → CLOSING → CLOSED|IN_PROGRESS`.
- `WorkOrder.close()` is replaced by `startClosing()`, `finalizeClose()`, `revertClosing()`.
- New domain events: `WorkOrderClosingStarted`, `WorkOrderClosingReverted`.
- `IInventoryStockPort` gains `consume()`, `compensate()`, `canConsume()` methods.
- `CloseWorkOrderHandler` becomes a compensating saga orchestrator.
