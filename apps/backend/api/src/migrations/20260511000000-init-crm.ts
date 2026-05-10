import { Migration } from '@mikro-orm/migrations';

export class Migration20260511000000 extends Migration {
  override up(): void {
    this.addSql(`create table if not exists "crm_client" (
      "id" uuid not null,
      "last_name" text not null,
      "first_name" text not null,
      "middle_name" text null,
      "phone_e164" text not null,
      "email" text null,
      "birth_date" date null,
      "source" text null,
      "type" text not null,
      "status" text not null default 'ACTIVE',
      "comment" text not null default '',
      "created_at" timestamptz not null default now(),
      "anonymized_at" timestamptz null,
      "version" int not null default 1,
      constraint "crm_client_pkey" primary key ("id")
    );`);

    this.addSql(
      `create unique index if not exists "uq_client_phone"
        on "crm_client" ("phone_e164") where "status" = 'ACTIVE';`,
    );

    this.addSql(`create table if not exists "crm_vehicle" (
      "id" uuid not null,
      "client_id" uuid not null,
      "make" text not null,
      "model" text not null,
      "body_type" text not null,
      "license_plate" text null,
      "vin" text null,
      "year" int null,
      "color" text null,
      "comment" text not null default '',
      "is_active" boolean not null default true,
      constraint "crm_vehicle_pkey" primary key ("id"),
      constraint "crm_vehicle_client_fk" foreign key ("client_id")
        references "crm_client" ("id") on update cascade on delete cascade
    );`);

    this.addSql(
      `create index if not exists "idx_vehicle_client"
        on "crm_vehicle" ("client_id", "is_active");`,
    );

    this.addSql(`create table if not exists "crm_consent" (
      "id" uuid not null,
      "client_id" uuid not null,
      "type" text not null,
      "given_at" timestamptz not null,
      "revoked_at" timestamptz null,
      "policy_version" text not null,
      constraint "crm_consent_pkey" primary key ("id"),
      constraint "crm_consent_client_fk" foreign key ("client_id")
        references "crm_client" ("id") on update cascade on delete cascade
    );`);

    this.addSql(
      `create index if not exists "idx_consent_client_type"
        on "crm_consent" ("client_id", "type") where "revoked_at" is null;`,
    );

    this.addSql(`create table if not exists "crm_visit_history" (
      "id" uuid not null,
      "client_id" uuid not null,
      "vehicle_id" uuid null,
      "appointment_id" uuid not null,
      "work_order_id" uuid null,
      "branch_id" uuid not null,
      "master_id" uuid not null,
      "services_summary" jsonb not null default '[]',
      "scheduled_at" timestamptz not null,
      "started_at" timestamptz null,
      "completed_at" timestamptz null,
      "cancelled_at" timestamptz null,
      "status" text not null,
      "total_amount_cents" bigint null,
      "materials_total_cents" bigint null,
      "photo_count" int not null default 0,
      "before_photo_urls" jsonb null,
      "after_photo_urls" jsonb null,
      "updated_at" timestamptz not null default now(),
      constraint "crm_visit_history_pkey" primary key ("id")
    );`);

    this.addSql(
      `create unique index if not exists "uq_visit_history_appointment"
        on "crm_visit_history" ("appointment_id");`,
    );

    this.addSql(
      `create index if not exists "idx_visit_history_client_completed"
        on "crm_visit_history" ("client_id", "completed_at" desc);`,
    );

    this.addSql(
      `create index if not exists "idx_visit_history_vehicle"
        on "crm_visit_history" ("vehicle_id", "completed_at" desc);`,
    );

    this.addSql(`create table if not exists "crm_anonymization_request" (
      "id" uuid not null,
      "client_id" uuid not null,
      "requested_by" uuid not null,
      "reason" text not null,
      "requested_at" timestamptz not null,
      "due_by" timestamptz not null,
      "status" text not null default 'PENDING',
      "completed_by" uuid null,
      "completed_at" timestamptz null,
      "cancelled_by" uuid null,
      "cancelled_at" timestamptz null,
      "cancel_reason" text null,
      constraint "crm_anonymization_request_pkey" primary key ("id")
    );`);

    this.addSql(
      `create index if not exists "idx_anonymization_pending"
        on "crm_anonymization_request" ("status", "due_by") where "status" = 'PENDING';`,
    );

    this.addSql(`create table if not exists "pii_access_log" (
      "id" uuid not null,
      "actor_user_id" uuid not null,
      "client_id" uuid not null,
      "operation" text not null,
      "fields" jsonb null,
      "occurred_at" timestamptz not null default now(),
      "ip" text null,
      "user_agent" text null,
      constraint "pii_access_log_pkey" primary key ("id")
    );`);

    this.addSql(
      `create index if not exists "idx_pii_log_client"
        on "pii_access_log" ("client_id", "occurred_at" desc);`,
    );

    this.addSql(
      `create index if not exists "idx_pii_log_actor"
        on "pii_access_log" ("actor_user_id", "occurred_at" desc);`,
    );
  }

  override down(): void {
    this.addSql('drop table if exists "pii_access_log";');
    this.addSql('drop table if exists "crm_anonymization_request";');
    this.addSql('drop table if exists "crm_visit_history";');
    this.addSql('drop table if exists "crm_consent";');
    this.addSql('drop table if exists "crm_vehicle";');
    this.addSql('drop table if exists "crm_client";');
  }
}
