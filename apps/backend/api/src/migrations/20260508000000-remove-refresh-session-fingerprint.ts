import { Migration } from '@mikro-orm/migrations';

export class Migration20260508000000 extends Migration {
  override up(): void {
    this.addSql(`alter table "iam_refresh_session" drop column if exists "device_fingerprint";`);
  }

  override down(): void {
    this.addSql(
      `alter table "iam_refresh_session" add column if not exists "device_fingerprint" text null;`,
    );
  }
}
