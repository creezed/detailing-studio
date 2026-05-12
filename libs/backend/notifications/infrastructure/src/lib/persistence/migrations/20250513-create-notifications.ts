import type { EntityManager } from '@mikro-orm/postgresql';

interface TemplateRow {
  readonly code: string;
  readonly title: string;
  readonly default_channels: string;
  readonly is_critical: boolean;
}

const TEMPLATE_SEEDS: readonly TemplateRow[] = [
  {
    code: 'APPOINTMENT_CONFIRMED',
    default_channels: '["EMAIL","SMS","TELEGRAM","PUSH"]',
    is_critical: false,
    title: 'Запись подтверждена',
  },
  {
    code: 'APPOINTMENT_REMINDER',
    default_channels: '["SMS","PUSH"]',
    is_critical: false,
    title: 'Напоминание о записи',
  },
  {
    code: 'APPOINTMENT_CANCELLED',
    default_channels: '["EMAIL","SMS","TELEGRAM","PUSH"]',
    is_critical: true,
    title: 'Запись отменена',
  },
  {
    code: 'APPOINTMENT_RESCHEDULED',
    default_channels: '["EMAIL","SMS","TELEGRAM","PUSH"]',
    is_critical: true,
    title: 'Запись перенесена',
  },
  {
    code: 'WORK_ORDER_COMPLETED',
    default_channels: '["EMAIL","PUSH"]',
    is_critical: false,
    title: 'Наряд завершён',
  },
  {
    code: 'CANCELLATION_REQUEST_NEW',
    default_channels: '["EMAIL","TELEGRAM","PUSH"]',
    is_critical: false,
    title: 'Новая заявка на отмену',
  },
  {
    code: 'LOW_STOCK',
    default_channels: '["EMAIL","TELEGRAM"]',
    is_critical: false,
    title: 'Низкий остаток на складе',
  },
  {
    code: 'OWNER_DIGEST_DAILY',
    default_channels: '["EMAIL","TELEGRAM"]',
    is_critical: false,
    title: 'Ежедневная сводка',
  },
  {
    code: 'USER_REGISTERED',
    default_channels: '["EMAIL"]',
    is_critical: false,
    title: 'Регистрация пользователя',
  },
  {
    code: 'INVITATION_ISSUED',
    default_channels: '["EMAIL"]',
    is_critical: false,
    title: 'Приглашение в студию',
  },
];

export async function up(em: EntityManager): Promise<void> {
  const knex = em.getKnex();

  await knex.raw(`
      CREATE TABLE IF NOT EXISTS ntf_notification_template (
        code TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body_by_channel JSONB NOT NULL DEFAULT '{}',
        default_channels JSONB NOT NULL DEFAULT '[]',
        is_critical BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

  await knex.raw(`
      CREATE TABLE IF NOT EXISTS ntf_notification (
        id UUID PRIMARY KEY,
        recipient_kind TEXT NOT NULL,
        recipient_user_id UUID,
        recipient_phone TEXT,
        recipient_email TEXT,
        recipient_chat_id TEXT,
        template_code TEXT NOT NULL,
        channel TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts JSONB NOT NULL DEFAULT '[]',
        scheduled_for TIMESTAMPTZ,
        dedup_scope_key TEXT,
        dedup_template_code TEXT,
        dedup_window_ends_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        last_error TEXT
      );
    `);

  await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ntf_notification_status_scheduled
        ON ntf_notification (status, scheduled_for);
    `);
  await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ntf_notification_recipient_created
        ON ntf_notification (recipient_user_id, created_at DESC);
    `);
  await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ntf_notification_dedup_created
        ON ntf_notification (dedup_scope_key, created_at DESC);
    `);

  await knex.raw(`
      CREATE TABLE IF NOT EXISTS ntf_user_notification_preferences (
        user_id UUID PRIMARY KEY,
        channels_by_template JSONB NOT NULL DEFAULT '{}',
        quiet_hours JSONB,
        unsubscribed_channels JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

  await knex.raw(`
      CREATE TABLE IF NOT EXISTS ntf_push_subscription (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expired_at TIMESTAMPTZ
      );
    `);
  await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_ntf_push_sub_user_id
        ON ntf_push_subscription (user_id);
    `);

  await knex.raw(`
      CREATE TABLE IF NOT EXISTS ntf_notification_dedup_key (
        scope_key TEXT PRIMARY KEY,
        template_code TEXT NOT NULL,
        last_issued_at TIMESTAMPTZ NOT NULL,
        window_ends_at TIMESTAMPTZ NOT NULL
      );
    `);

  for (const t of TEMPLATE_SEEDS) {
    await knex.raw(
      `INSERT INTO ntf_notification_template (code, title, body_by_channel, default_channels, is_critical, updated_at)
       VALUES (?, ?, '{}', ?::jsonb, ?, NOW())
       ON CONFLICT (code) DO NOTHING`,
      [t.code, t.title, t.default_channels, t.is_critical],
    );
  }
}

export async function down(em: EntityManager): Promise<void> {
  const knex = em.getKnex();

  await knex.raw('DROP TABLE IF EXISTS ntf_notification_dedup_key');
  await knex.raw('DROP TABLE IF EXISTS ntf_push_subscription');
  await knex.raw('DROP TABLE IF EXISTS ntf_user_notification_preferences');
  await knex.raw('DROP TABLE IF EXISTS ntf_notification');
  await knex.raw('DROP TABLE IF EXISTS ntf_notification_template');
}
