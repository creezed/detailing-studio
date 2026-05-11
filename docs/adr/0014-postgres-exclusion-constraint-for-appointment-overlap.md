# ADR-0014: PostgreSQL Exclusion Constraints for Appointment Overlap

**Status:** Accepted  
**Date:** 2026-05-11  
**Context:** Scheduling K.8 persistence and overlap protection

## Context

`Appointment` overlap checks are enforced in the domain/application layer before saving, but concurrent requests can still pass the same read check and create conflicting appointments for the same `Master` or `Bay`.

The Scheduling context must guarantee that active appointments never overlap for:
- The same `master_user_id`.
- The same non-null `bay_id`.

The active statuses are:
- `PENDING_CONFIRMATION`
- `CONFIRMED`
- `IN_PROGRESS`

## Decision

Scheduling persistence uses PostgreSQL exclusion constraints on `sch_appointment`:

```sql
exclude using gist (
  master_user_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
) where (status in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS'))
```

and the same pattern for `bay_id`, additionally filtered by `bay_id is not null`.

The migration enables `btree_gist`:

```sql
create extension if not exists "btree_gist";
```

This extension is required because UUID equality in a GiST exclusion constraint needs btree operator classes.

## Deployment considerations

`CREATE EXTENSION btree_gist` may require elevated database privileges depending on the managed PostgreSQL provider.

Deployment must handle one of these options before applying the scheduling migration:
- A privileged migration role can run `create extension if not exists "btree_gist"`.
- The platform team pre-installs `btree_gist` in the target database.
- The migration is split so the extension is applied by an operator-controlled step and the application migration only creates tables/constraints.

The migration intentionally does not drop `btree_gist` in `down()` because the extension can be shared by other database objects and may be managed by the platform.

## Consequences

- The database is the final authority for preventing concurrent overlap races.
- Application-level overlap queries remain necessary for user-friendly validation errors before save.
- Constraint violations use PostgreSQL error code `23P01` and must be mapped by infrastructure to an application/domain-level conflict where needed.
- Local and CI PostgreSQL images must allow `btree_gist` or pre-install it before running scheduling persistence tests.
