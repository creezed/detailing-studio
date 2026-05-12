import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import type { NotificationChannel, TemplateCode } from '@det/backend-notifications-domain';

const CHANNEL_DIR: Record<NotificationChannel, string> = {
  EMAIL: 'email',
  SMS: 'sms',
  TELEGRAM: 'telegram',
  PUSH: 'push',
};

const CHANNEL_EXT: Record<NotificationChannel, string> = {
  EMAIL: '.mjml.hbs',
  SMS: '.txt.hbs',
  TELEGRAM: '.md.hbs',
  PUSH: '.json.hbs',
};

const CHANNELS: NotificationChannel[] = [
  'EMAIL',
  'SMS',
  'TELEGRAM',
  'PUSH',
] as NotificationChannel[];

export interface TemplateBodyMap {
  readonly code: TemplateCode;
  readonly bodyByChannel: Partial<Record<NotificationChannel, string | null>>;
}

export function loadTemplateBodies(
  templatesDir: string,
  templateCodes: readonly TemplateCode[],
): readonly TemplateBodyMap[] {
  const results: TemplateBodyMap[] = [];

  for (const code of templateCodes) {
    const bodyByChannel: Partial<Record<NotificationChannel, string | null>> = {};

    for (const channel of CHANNELS) {
      const dir = CHANNEL_DIR[channel];
      const ext = CHANNEL_EXT[channel];
      const filePath = join(templatesDir, dir, `${code}${ext}`);

      if (existsSync(filePath)) {
        bodyByChannel[channel] = readFileSync(filePath, 'utf8');
      } else {
        bodyByChannel[channel] = null;
      }
    }

    results.push({ code, bodyByChannel });
  }

  return results;
}
