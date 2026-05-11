import { Migration } from '@mikro-orm/migrations';

export class Migration20260511120000 extends Migration {
  override up(): void {
    this.addSql('create extension if not exists "btree_gist";');

    this.addSql(`create table if not exists "sch_branch" (
      "id" uuid not null,
      "name" text not null,
      "address" text not null,
      "timezone" text not null,
      "is_active" boolean not null default true,
      "created_at" timestamptz not null default now(),
      constraint "sch_branch_pkey" primary key ("id")
    );`);

    this.addSql(`create index if not exists "idx_sch_branch_active_name"
      on "sch_branch" ("is_active", "name");`);

    this.addSql(`create table if not exists "sch_bay" (
      "id" uuid not null,
      "branch_id" uuid not null,
      "name" text not null,
      "is_active" boolean not null default true,
      constraint "sch_bay_pkey" primary key ("id"),
      constraint "sch_bay_branch_fk" foreign key ("branch_id") references "sch_branch" ("id") on update cascade on delete restrict,
      constraint "sch_bay_branch_name_unique" unique ("branch_id", "name")
    );`);

    this.addSql(`create index if not exists "idx_sch_bay_branch_active"
      on "sch_bay" ("branch_id", "is_active", "name");`);

    this.addSql(`create table if not exists "sch_branch_schedule" (
      "id" uuid not null,
      "branch_id" uuid not null,
      "weekly_pattern" jsonb not null,
      constraint "sch_branch_schedule_pkey" primary key ("id"),
      constraint "sch_branch_schedule_branch_fk" foreign key ("branch_id") references "sch_branch" ("id") on update cascade on delete cascade,
      constraint "sch_branch_schedule_branch_unique" unique ("branch_id")
    );`);

    this.addSql(`create table if not exists "sch_branch_schedule_exception" (
      "branch_schedule_id" uuid not null,
      "date" date not null,
      "is_closed" boolean not null,
      "custom_range" jsonb null,
      "reason" text null,
      constraint "sch_branch_schedule_exception_pkey" primary key ("branch_schedule_id", "date"),
      constraint "sch_branch_schedule_exception_schedule_fk" foreign key ("branch_schedule_id") references "sch_branch_schedule" ("id") on update cascade on delete cascade,
      constraint "sch_branch_schedule_exception_closed_check" check (not ("is_closed" and "custom_range" is not null))
    );`);

    this.addSql(`create table if not exists "sch_master_schedule" (
      "id" uuid not null,
      "master_user_id" uuid not null,
      "branch_id" uuid not null,
      "weekly_pattern" jsonb not null,
      constraint "sch_master_schedule_pkey" primary key ("id"),
      constraint "sch_master_schedule_branch_fk" foreign key ("branch_id") references "sch_branch" ("id") on update cascade on delete cascade,
      constraint "sch_master_schedule_master_branch_unique" unique ("master_user_id", "branch_id")
    );`);

    this.addSql(`create index if not exists "idx_sch_master_schedule_branch"
      on "sch_master_schedule" ("branch_id", "master_user_id");`);

    this.addSql(`create table if not exists "sch_master_unavailability" (
      "id" uuid not null,
      "master_schedule_id" uuid not null,
      "from_at" timestamptz not null,
      "to_at" timestamptz not null,
      "reason" text not null,
      constraint "sch_master_unavailability_pkey" primary key ("id"),
      constraint "sch_master_unavailability_schedule_fk" foreign key ("master_schedule_id") references "sch_master_schedule" ("id") on update cascade on delete cascade,
      constraint "sch_master_unavailability_period_check" check ("from_at" < "to_at")
    );`);

    this.addSql(`create index if not exists "idx_sch_master_unavailability_schedule_period"
      on "sch_master_unavailability" ("master_schedule_id", "from_at", "to_at");`);

    this.addSql(`create table if not exists "sch_appointment" (
      "id" uuid not null,
      "client_id" uuid not null,
      "vehicle_id" uuid not null,
      "branch_id" uuid not null,
      "bay_id" uuid null,
      "master_user_id" uuid not null,
      "starts_at" timestamptz not null,
      "ends_at" timestamptz not null,
      "timezone" text not null,
      "status" text not null,
      "creation_channel" text not null,
      "created_by" uuid not null,
      "cancellation_request" jsonb null,
      "created_at" timestamptz not null default now(),
      "version" int not null default 1,
      constraint "sch_appointment_pkey" primary key ("id"),
      constraint "sch_appointment_branch_fk" foreign key ("branch_id") references "sch_branch" ("id") on update cascade on delete restrict,
      constraint "sch_appointment_bay_fk" foreign key ("bay_id") references "sch_bay" ("id") on update cascade on delete set null,
      constraint "sch_appointment_period_check" check ("starts_at" < "ends_at"),
      constraint "sch_appointment_status_check" check ("status" in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
      constraint "sch_appointment_creation_channel_check" check ("creation_channel" in ('ONLINE', 'MANAGER', 'GUEST'))
    );`);

    this.addSql(`alter table "sch_appointment"
      add constraint "sch_appointment_master_no_overlap"
      exclude using gist (
        "master_user_id" with =,
        tstzrange("starts_at", "ends_at", '[)') with &&
      ) where ("status" in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS'));`);

    this.addSql(`alter table "sch_appointment"
      add constraint "sch_appointment_bay_no_overlap"
      exclude using gist (
        "bay_id" with =,
        tstzrange("starts_at", "ends_at", '[)') with &&
      ) where ("bay_id" is not null and "status" in ('PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS'));`);

    this.addSql(`create index if not exists "idx_sch_appointment_branch_status_starts"
      on "sch_appointment" ("branch_id", "status", "starts_at", "id");`);

    this.addSql(`create index if not exists "idx_sch_appointment_master_starts"
      on "sch_appointment" ("master_user_id", "starts_at", "id");`);

    this.addSql(`create index if not exists "idx_sch_appointment_bay_starts"
      on "sch_appointment" ("bay_id", "starts_at", "id") where "bay_id" is not null;`);

    this.addSql(`create index if not exists "idx_sch_appointment_client_starts"
      on "sch_appointment" ("client_id", "starts_at", "id");`);

    this.addSql(`create table if not exists "sch_appointment_service" (
      "id" uuid not null,
      "appointment_id" uuid not null,
      "service_id" uuid not null,
      "service_name_snapshot" text not null,
      "duration_snapshot" int not null,
      "price_cents_snapshot" bigint not null,
      constraint "sch_appointment_service_pkey" primary key ("id"),
      constraint "sch_appointment_service_appointment_fk" foreign key ("appointment_id") references "sch_appointment" ("id") on update cascade on delete cascade,
      constraint "sch_appointment_service_duration_check" check ("duration_snapshot" > 0),
      constraint "sch_appointment_service_price_check" check ("price_cents_snapshot" >= 0)
    );`);

    this.addSql(`create index if not exists "idx_sch_appointment_service_appointment"
      on "sch_appointment_service" ("appointment_id");`);
  }

  override down(): void {
    this.addSql('drop table if exists "sch_appointment_service" cascade;');
    this.addSql('drop table if exists "sch_appointment" cascade;');
    this.addSql('drop table if exists "sch_master_unavailability" cascade;');
    this.addSql('drop table if exists "sch_master_schedule" cascade;');
    this.addSql('drop table if exists "sch_branch_schedule_exception" cascade;');
    this.addSql('drop table if exists "sch_branch_schedule" cascade;');
    this.addSql('drop table if exists "sch_bay" cascade;');
    this.addSql('drop table if exists "sch_branch" cascade;');
  }
}
