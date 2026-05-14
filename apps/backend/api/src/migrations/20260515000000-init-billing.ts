import { Migration } from '@mikro-orm/migrations';

export class Migration20260515000000 extends Migration {
  override up(): void {
    this.addSql(`create table if not exists "bil_plan" (
      "code" text not null,
      "name" text not null,
      "price_cents_per_month" bigint not null,
      "max_branches" int null,
      "max_masters" int null,
      "max_appointments_per_month" int null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "bil_plan_pkey" primary key ("code")
    );`);

    this.addSql(`create table if not exists "bil_subscription" (
      "id" uuid not null,
      "tenant_id" uuid not null,
      "plan_code" text not null,
      "status" text not null,
      "current_period_started_at" timestamptz not null,
      "next_billing_at" timestamptz not null,
      "trial_ends_at" timestamptz null,
      "cancelled_at" timestamptz null,
      "cancel_reason" text null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      constraint "bil_subscription_pkey" primary key ("id"),
      constraint "bil_subscription_plan_fk" foreign key ("plan_code")
        references "bil_plan" ("code") on update cascade
    );`);

    this.addSql(
      `create unique index if not exists "uq_subscription_tenant"
        on "bil_subscription" ("tenant_id");`,
    );

    this.addSql(
      `create index if not exists "idx_subscription_status_billing"
        on "bil_subscription" ("status", "next_billing_at");`,
    );

    this.addSql(`create table if not exists "bil_invoice" (
      "id" uuid not null,
      "subscription_id" uuid not null,
      "plan_code" text not null,
      "amount_cents" bigint not null,
      "currency" text not null default 'RUB',
      "period_started_at" timestamptz not null,
      "period_ends_at" timestamptz not null,
      "status" text not null,
      "issued_at" timestamptz not null,
      "paid_at" timestamptz null,
      "voided_at" timestamptz null,
      "payment_ref" text null,
      constraint "bil_invoice_pkey" primary key ("id"),
      constraint "bil_invoice_subscription_fk" foreign key ("subscription_id")
        references "bil_subscription" ("id") on update cascade
    );`);

    this.addSql(
      `create index if not exists "idx_invoice_subscription_issued"
        on "bil_invoice" ("subscription_id", "issued_at" desc);`,
    );

    this.addSql(
      `create unique index if not exists "uq_invoice_period"
        on "bil_invoice" ("subscription_id", "period_started_at", "period_ends_at");`,
    );

    this
      .addSql(`insert into "bil_plan" ("code", "name", "price_cents_per_month", "max_branches", "max_masters", "max_appointments_per_month")
      values
        ('STARTER',  'Starter',  299000,  1,    3,    200),
        ('STANDARD', 'Standard', 599000,  3,    10,   1000),
        ('PRO',      'Pro',      1199000, null, null, null)
      on conflict ("code") do nothing;`);

    this.addSql(`insert into "bil_subscription" (
        "id", "tenant_id", "plan_code", "status",
        "current_period_started_at", "next_billing_at", "trial_ends_at"
      )
      select
        gen_random_uuid(),
        '00000000-0000-4000-a000-000000000001'::uuid,
        'STARTER',
        'TRIAL',
        now(),
        now() + interval '14 days',
        now() + interval '14 days'
      where not exists (
        select 1 from "bil_subscription"
        where "tenant_id" = '00000000-0000-4000-a000-000000000001'::uuid
      );`);
  }

  override down(): void {
    this.addSql('drop table if exists "bil_invoice";');
    this.addSql('drop table if exists "bil_subscription";');
    this.addSql('drop table if exists "bil_plan";');
  }
}
