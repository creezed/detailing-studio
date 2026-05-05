import { Migration } from '@mikro-orm/migrations';

export class Migration20260505232000 extends Migration {
  override up(): void {
    this.addSql(`do $$
    begin
      if exists (
        select 1 from information_schema.columns
        where table_name = 'outbox_events' and column_name = 'attempts'
      ) then
        alter table "outbox_events" rename column "attempts" to "retry_count";
      end if;
    end $$;`);
    this.addSql(`alter table "outbox_events" alter column "id" type uuid using "id"::uuid;`);
    this.addSql(
      `alter table "outbox_events" alter column "aggregate_id" type uuid using "aggregate_id"::uuid;`,
    );
    this.addSql(
      `alter table "outbox_events" add column if not exists "retry_after_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "outbox_events" add column if not exists "failed_at" timestamptz null;`,
    );
    this.addSql(`alter table "outbox_events" alter column "retry_count" set default 0;`);
  }

  override down(): void {
    this.addSql(`alter table "outbox_events" drop column if exists "failed_at";`);
    this.addSql(`alter table "outbox_events" drop column if exists "retry_after_at";`);
    this.addSql(`alter table "outbox_events" alter column "aggregate_id" type text;`);
    this.addSql(`alter table "outbox_events" alter column "id" type text;`);
    this.addSql(`alter table "outbox_events" rename column "retry_count" to "attempts";`);
  }
}
