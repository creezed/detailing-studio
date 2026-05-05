import { Migration } from '@mikro-orm/migrations';

export class Migration20260505220000 extends Migration {
  override up(): void {
    this.addSql(`create table if not exists "outbox_events" (
      "id" text not null,
      "aggregate_type" text not null,
      "aggregate_id" text not null,
      "event_type" text not null,
      "payload" jsonb not null,
      "occurred_at" timestamptz not null,
      "published_at" timestamptz null,
      "attempts" int not null default 0,
      "last_error" text null,
      constraint "outbox_events_pkey" primary key ("id")
    );`);
    this.addSql(
      `create index if not exists "idx_outbox_unpublished" on "outbox_events" ("occurred_at") where "published_at" is null;`,
    );

    this.addSql(`create table if not exists "iam_user" (
      "id" uuid not null,
      "email" text null,
      "phone" text null,
      "password_hash" text null,
      "full_name" text not null,
      "status" text not null,
      "role_set" jsonb not null,
      "branch_ids" jsonb not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz null,
      "version" int not null default 1,
      constraint "iam_user_pkey" primary key ("id")
    );`);
    this.addSql(
      `create unique index if not exists "iam_user_email_unique" on "iam_user" ("email") where "email" is not null;`,
    );
    this.addSql(
      `create unique index if not exists "iam_user_phone_unique" on "iam_user" ("phone") where "phone" is not null;`,
    );
    this.addSql(`create index if not exists "idx_iam_user_status" on "iam_user" ("status");`);

    this.addSql(`create table if not exists "iam_invitation" (
      "id" uuid not null,
      "email" text not null,
      "role" text not null,
      "branch_ids" jsonb not null,
      "token_hash" text not null,
      "status" text not null,
      "issued_at" timestamptz not null,
      "expires_at" timestamptz not null,
      "accepted_at" timestamptz null,
      "revoked_at" timestamptz null,
      "invited_by" uuid not null,
      constraint "iam_invitation_pkey" primary key ("id")
    );`);
    this.addSql(
      `create unique index if not exists "iam_invitation_token_hash_unique" on "iam_invitation" ("token_hash");`,
    );
    this.addSql(
      `create index if not exists "idx_iam_invitation_email_status" on "iam_invitation" ("email", "status");`,
    );

    this.addSql(`create table if not exists "iam_otp_request" (
      "id" uuid not null,
      "phone" text not null,
      "purpose" text not null,
      "code_hash" text not null,
      "attempts_left" int not null,
      "status" text not null,
      "expires_at" timestamptz not null,
      "created_at" timestamptz not null,
      "verified_at" timestamptz null,
      constraint "iam_otp_request_pkey" primary key ("id")
    );`);
    this.addSql(
      `create index if not exists "idx_iam_otp_request_phone_purpose_status" on "iam_otp_request" ("phone", "purpose", "status");`,
    );

    this.addSql(`create table if not exists "iam_refresh_session" (
      "id" uuid not null,
      "user_id" uuid not null,
      "device_fingerprint" text null,
      "token_hash" text not null,
      "rotated_token_hashes" jsonb not null default '[]'::jsonb,
      "rotation_counter" int not null default 0,
      "status" text not null,
      "issued_at" timestamptz not null,
      "expires_at" timestamptz not null,
      "last_rotated_at" timestamptz null,
      "revoked_at" timestamptz null,
      "revoked_by" uuid null,
      "compromised_at" timestamptz null,
      "parent_session_id" uuid null,
      constraint "iam_refresh_session_pkey" primary key ("id")
    );`);
    this.addSql(
      `create index if not exists "idx_iam_refresh_session_user_status" on "iam_refresh_session" ("user_id", "status");`,
    );
    this.addSql(
      `create index if not exists "idx_iam_refresh_session_token_hash" on "iam_refresh_session" ("token_hash");`,
    );
    this.addSql(
      `create index if not exists "idx_iam_refresh_session_rotated_hashes" on "iam_refresh_session" using gin ("rotated_token_hashes");`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "iam_refresh_session";`);
    this.addSql(`drop table if exists "iam_otp_request";`);
    this.addSql(`drop table if exists "iam_invitation";`);
    this.addSql(`drop table if exists "iam_user";`);
    this.addSql(`drop table if exists "outbox_events";`);
  }
}
