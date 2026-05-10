import { Migration } from '@mikro-orm/migrations';

export class Migration20260510000000 extends Migration {
  override up(): void {
    this.addSql(`create table if not exists "inv_sku" (
      "id" uuid not null,
      "article_number" text not null,
      "name" text not null,
      "group" text not null,
      "base_unit" text not null,
      "barcode" text null,
      "has_expiry" boolean not null default false,
      "photo_url" text null,
      "is_active" boolean not null default true,
      "description_md" text not null default '',
      "created_at" timestamptz not null default now(),
      constraint "inv_sku_pkey" primary key ("id")
    );`);

    this.addSql(
      `create unique index if not exists "uq_sku_article" on "inv_sku" ("article_number");`,
    );

    this.addSql(`create table if not exists "inv_packaging" (
      "id" uuid not null,
      "sku_id" uuid not null,
      "name" text not null,
      "coefficient" numeric not null,
      constraint "inv_packaging_pkey" primary key ("id"),
      constraint "inv_packaging_sku_fk" foreign key ("sku_id")
        references "inv_sku" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table if not exists "inv_supplier" (
      "id" uuid not null,
      "name" text not null,
      "inn" text null,
      "contact_name" text null,
      "contact_phone" text null,
      "contact_email" text null,
      "address" text null,
      "is_active" boolean not null default true,
      constraint "inv_supplier_pkey" primary key ("id")
    );`);

    this.addSql(`create table if not exists "inv_stock" (
      "id" uuid not null,
      "sku_id" uuid not null,
      "branch_id" uuid not null,
      "base_unit" text not null,
      "reorder_level" numeric(18,4) not null default 0,
      "average_cost_cents" bigint not null default 0,
      "updated_at" timestamptz not null default now(),
      "version" int not null default 1,
      constraint "inv_stock_pkey" primary key ("id")
    );`);

    this.addSql(
      `create unique index if not exists "uq_stock_sku_branch" on "inv_stock" ("sku_id", "branch_id");`,
    );

    this.addSql(`create table if not exists "inv_batch" (
      "id" uuid not null,
      "stock_id" uuid not null,
      "supplier_id" uuid null,
      "source_type" text not null,
      "source_doc_id" uuid not null,
      "initial_quantity" numeric(18,4) not null,
      "remaining_quantity" numeric(18,4) not null,
      "unit_cost_cents" bigint not null,
      "expires_at" date null,
      "received_at" timestamptz not null,
      constraint "inv_batch_pkey" primary key ("id"),
      constraint "inv_batch_stock_fk" foreign key ("stock_id")
        references "inv_stock" ("id") on update cascade on delete cascade
    );`);

    this.addSql(
      `create index if not exists "idx_batch_expiry"
        on "inv_batch" ("stock_id", "expires_at") where "remaining_quantity" > 0;`,
    );

    this.addSql(`create table if not exists "inv_stock_movement" (
      "id" uuid not null,
      "stock_id" uuid not null,
      "batch_id" uuid null,
      "movement_type" text not null,
      "delta" numeric(18,4) not null,
      "cost_cents" bigint not null,
      "reason" text null,
      "source_type" text not null,
      "source_doc_id" uuid not null,
      "actor_user_id" uuid null,
      "occurred_at" timestamptz not null,
      constraint "inv_stock_movement_pkey" primary key ("id"),
      constraint "inv_stock_movement_stock_fk" foreign key ("stock_id")
        references "inv_stock" ("id") on update cascade on delete restrict
    );`);

    this.addSql(
      `create index if not exists "idx_movement_stock_occurred"
        on "inv_stock_movement" ("stock_id", "occurred_at" desc);`,
    );

    this.addSql(
      `create index if not exists "idx_movement_source"
        on "inv_stock_movement" ("source_type", "source_doc_id");`,
    );

    this.addSql(`create table if not exists "inv_receipt" (
      "id" uuid not null,
      "supplier_id" uuid not null,
      "branch_id" uuid not null,
      "supplier_invoice_number" text null,
      "supplier_invoice_date" date null,
      "status" text not null,
      "attachment_url" text null,
      "created_by" uuid not null,
      "posted_by" uuid null,
      "created_at" timestamptz not null default now(),
      "posted_at" timestamptz null,
      constraint "inv_receipt_pkey" primary key ("id")
    );`);

    this.addSql(`create table if not exists "inv_receipt_line" (
      "id" uuid not null,
      "receipt_id" uuid not null,
      "sku_id" uuid not null,
      "packaging_id" uuid null,
      "package_quantity" numeric(18,4) not null,
      "base_quantity" numeric(18,4) not null,
      "unit_cost_cents" bigint not null,
      "expires_at" date null,
      constraint "inv_receipt_line_pkey" primary key ("id"),
      constraint "inv_receipt_line_receipt_fk" foreign key ("receipt_id")
        references "inv_receipt" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table if not exists "inv_adjustment" (
      "id" uuid not null,
      "branch_id" uuid not null,
      "status" text not null,
      "reason" text not null,
      "total_amount_cents" bigint not null default 0,
      "created_by" uuid not null,
      "approved_by" uuid null,
      "created_at" timestamptz not null default now(),
      "approved_at" timestamptz null,
      constraint "inv_adjustment_pkey" primary key ("id")
    );`);

    this.addSql(`create table if not exists "inv_adjustment_line" (
      "id" uuid not null,
      "adjustment_id" uuid not null,
      "sku_id" uuid not null,
      "delta" numeric(18,4) not null,
      "snapshot_unit_cost_cents" bigint not null,
      constraint "inv_adjustment_line_pkey" primary key ("id"),
      constraint "inv_adjustment_line_adjustment_fk" foreign key ("adjustment_id")
        references "inv_adjustment" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table if not exists "inv_transfer" (
      "id" uuid not null,
      "from_branch_id" uuid not null,
      "to_branch_id" uuid not null,
      "status" text not null,
      "created_by" uuid not null,
      "created_at" timestamptz not null default now(),
      "posted_by" uuid null,
      "posted_at" timestamptz null,
      constraint "inv_transfer_pkey" primary key ("id")
    );`);

    this.addSql(`create table if not exists "inv_transfer_line" (
      "id" uuid not null,
      "transfer_id" uuid not null,
      "sku_id" uuid not null,
      "quantity" numeric(18,4) not null,
      "base_unit" text not null,
      constraint "inv_transfer_line_pkey" primary key ("id"),
      constraint "inv_transfer_line_transfer_fk" foreign key ("transfer_id")
        references "inv_transfer" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table if not exists "inv_stock_taking" (
      "id" uuid not null,
      "branch_id" uuid not null,
      "status" text not null,
      "started_at" timestamptz not null default now(),
      "completed_at" timestamptz null,
      "created_by" uuid not null,
      constraint "inv_stock_taking_pkey" primary key ("id")
    );`);

    this.addSql(`create table if not exists "inv_stock_taking_line" (
      "id" uuid not null,
      "stock_taking_id" uuid not null,
      "sku_id" uuid not null,
      "expected_quantity" numeric(18,4) not null,
      "actual_quantity" numeric(18,4) null,
      "base_unit" text not null,
      constraint "inv_stock_taking_line_pkey" primary key ("id"),
      constraint "inv_stock_taking_line_st_fk" foreign key ("stock_taking_id")
        references "inv_stock_taking" ("id") on update cascade on delete cascade
    );`);
  }

  override down(): void {
    this.addSql('drop table if exists "inv_stock_taking_line";');
    this.addSql('drop table if exists "inv_stock_taking";');
    this.addSql('drop table if exists "inv_transfer_line";');
    this.addSql('drop table if exists "inv_transfer";');
    this.addSql('drop table if exists "inv_adjustment_line";');
    this.addSql('drop table if exists "inv_adjustment";');
    this.addSql('drop table if exists "inv_receipt_line";');
    this.addSql('drop table if exists "inv_receipt";');
    this.addSql('drop table if exists "inv_stock_movement";');
    this.addSql('drop table if exists "inv_batch";');
    this.addSql('drop table if exists "inv_stock";');
    this.addSql('drop table if exists "inv_packaging";');
    this.addSql('drop table if exists "inv_supplier";');
    this.addSql('drop table if exists "inv_sku";');
  }
}
