import { Migration } from '@mikro-orm/migrations';

export class Migration20260509000000 extends Migration {
  override up(): void {
    this.addSql(`create table if not exists "catalog_service_category" (
      "id" uuid not null,
      "name" text not null,
      "icon" text not null,
      "display_order" int not null default 0,
      "is_active" boolean not null default true,
      constraint "catalog_service_category_pkey" primary key ("id")
    );`);

    this.addSql(`create table if not exists "catalog_service" (
      "id" uuid not null,
      "category_id" uuid not null,
      "name" text not null,
      "description_md" text not null default '',
      "duration_minutes" int not null,
      "pricing_type" text not null,
      "base_price_cents" bigint null,
      "is_active" boolean not null default true,
      "display_order" int not null default 0,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "version" int not null default 1,
      constraint "catalog_service_pkey" primary key ("id"),
      constraint "catalog_service_category_fk" foreign key ("category_id")
        references "catalog_service_category" ("id") on update cascade on delete restrict
    );`);

    this.addSql(
      `create index if not exists "idx_catalog_service_category_id"
        on "catalog_service" ("category_id");`,
    );

    this.addSql(`create table if not exists "catalog_service_pricing" (
      "service_id" uuid not null,
      "body_type" text not null,
      "price_cents" bigint not null,
      constraint "catalog_service_pricing_pkey" primary key ("service_id", "body_type"),
      constraint "catalog_service_pricing_service_fk" foreign key ("service_id")
        references "catalog_service" ("id") on update cascade on delete cascade
    );`);

    this.addSql(`create table if not exists "catalog_material_norm" (
      "id" uuid not null,
      "service_id" uuid not null,
      "sku_id" uuid not null,
      "amount" numeric not null,
      "unit" text not null default 'PCS',
      "body_type_coefficients" jsonb null,
      constraint "catalog_material_norm_pkey" primary key ("id"),
      constraint "catalog_material_norm_service_fk" foreign key ("service_id")
        references "catalog_service" ("id") on update cascade on delete cascade
    );`);

    this.addSql(
      `create index if not exists "idx_catalog_material_norm_service_id"
        on "catalog_material_norm" ("service_id");`,
    );

    this.addSql(`create table if not exists "catalog_service_price_history" (
      "id" uuid not null,
      "service_id" uuid not null,
      "pricing_type" text not null,
      "base_price_cents" bigint null,
      "pricing_snapshot" jsonb not null,
      "changed_by" uuid null,
      "changed_at" timestamptz not null default now(),
      constraint "catalog_service_price_history_pkey" primary key ("id"),
      constraint "catalog_service_price_history_service_fk" foreign key ("service_id")
        references "catalog_service" ("id") on update cascade on delete cascade
    );`);

    this.addSql(
      `create index if not exists "idx_catalog_service_price_history_service_id"
        on "catalog_service_price_history" ("service_id");`,
    );
  }

  override down(): void {
    this.addSql('drop table if exists "catalog_service_price_history";');
    this.addSql('drop table if exists "catalog_material_norm";');
    this.addSql('drop table if exists "catalog_service_pricing";');
    this.addSql('drop table if exists "catalog_service";');
    this.addSql('drop table if exists "catalog_service_category";');
  }
}
