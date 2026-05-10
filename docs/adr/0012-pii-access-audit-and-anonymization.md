# ADR-0012: PII Access Audit and Client Anonymization Architecture

**Status:** Accepted  
**Date:** 2026-05-11  
**Context:** 152-ФЗ compliance for personal data protection

## Context

Russian Federal Law 152-ФЗ "On Personal Data" requires:
- Explicit consent for personal data processing.
- Right to access (data export).
- Right to deletion (anonymization).
- Logging of all access to personal data.

The CRM bounded context manages `Client` aggregates that contain PII: full name, phone, email, birth date.

## Decision

### 1. PII Access Log — separate table

All access to `Client` PII is recorded in `pii_access_log` table (schema in `engineering.md` §9.4.3):

| Operation | Trigger |
|-----------|---------|
| `VIEW` | Any `GetClientById`, `GetClientByPhone`, `GetClientVehicles` query |
| `UPDATE` | `UpdateClientProfile`, `AddVehicle`, `UpdateVehicle` commands |
| `EXPORT` | `RequestClientDataExport` command |
| `DELETE` | `AnonymizeClient` command |

**Why a separate table (not the main audit_log)?**
- Dedicated retention policy: PII access logs must be retained for 3 years per 152-ФЗ.
- Efficient querying: OWNER can query PII access history per client without scanning the general audit log.
- Write-only from application layer: the `PiiAccessLogger` service writes entries; reading is an interfaces-layer concern (J.6).

**What is NOT logged:**
- Internal system queries (e.g., scheduler checking appointment data).
- List queries that return only non-PII summary data.
- Domain events (they go through the outbox).

### 2. Consent management

- `GiveConsentCommand` — records consent with policy version (from `ConfigPort` env `CRM_CURRENT_POLICY_VERSION`).
- `RevokeConsentCommand` — only for non-critical consent types (e.g., `MARKETING_NOTIFICATIONS`).
- Revoking `PERSONAL_DATA_PROCESSING` consent is not allowed directly — the handler throws `MustAnonymizeError` instructing the caller to use `AnonymizeClientCommand` instead. This ensures anonymization is an explicit, auditable action.

### 3. Anonymization flow

```
Client/Manager/Owner
  → RequestClientAnonymizationCommand
    → creates AnonymizationRequest (status=PENDING, dueBy=now+30d)
    → emits ClientAnonymizationRequested (no PII)

Owner (within 30 days)
  → AnonymizeClientCommand
    → Client.anonymize() replaces PII with placeholders
    → marks AnonymizationRequest as COMPLETED
    → emits ClientAnonymized (no PII in event payload)

Owner (optional)
  → CancelAnonymizationRequestCommand
    → PENDING → CANCELLED
```

**Terminal state:** After anonymization, `Client` status becomes `ANONYMIZED`. All subsequent mutations (`updateProfile`, `giveConsent`, `addVehicle`, etc.) throw `ClientAnonymizedError`.

### 4. Historical events

Domain events emitted before anonymization (e.g., `ClientRegistered` with real name) remain in the outbox/audit log. They are NOT retroactively modified. Rationale:
- Event immutability is a core architectural invariant.
- Old outbox events are cleaned by the retention job after 6 months (created in milestone I.5).
- The `pii_access_log` provides a separate, PII-safe audit trail.

### 5. Data export

`RequestClientDataExportCommand` aggregates all client PII (profile, vehicles, consents) into a JSON bundle, uploads it to S3-compatible storage via `IFileStoragePort` with a 7-day TTL, and returns a signed URL. `GetClientDataExportQuery` retrieves the signed URL by export ID.

### 6. Cross-context impact of anonymization

For MVP: future appointments for anonymized clients remain in the scheduling system but PII is hidden in read projections (the `Client` aggregate already has placeholder data). A saga subscribing to `ClientAnonymized` may mark future appointments in a later milestone.

## Consequences

- Every read/write of `Client` PII must go through the application layer where `PiiAccessLogger` can intercept.
- Direct database queries to `crm_client` bypassing the application layer will not be logged — this is acceptable for DB admin access but should be minimized.
- The `AnonymizationRequest` table and `pii_access_log` table migrations are deferred to J.5.
- The interfaces-layer endpoint for reading `pii_access_log` is deferred to J.6 (OWNER only).
