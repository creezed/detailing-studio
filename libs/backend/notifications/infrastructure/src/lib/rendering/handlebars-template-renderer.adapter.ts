import { Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';

import type { ITemplateRenderer } from '@det/backend-notifications-application';
import type { TemplatePayload } from '@det/backend-notifications-domain';

@Injectable()
export class HandlebarsTemplateRenderer implements ITemplateRenderer {
  private readonly cache = new Map<string, HandlebarsTemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  render(templateBody: string, payload: TemplatePayload): Promise<string> {
    let compiled = this.cache.get(templateBody);

    if (!compiled) {
      compiled = Handlebars.compile(templateBody, { noEscape: true });
      this.cache.set(templateBody, compiled);
    }

    return Promise.resolve(compiled(payload));
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (value: string) => {
      if (!value) return '';
      const d = new Date(value);

      return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
      });
    });

    Handlebars.registerHelper('formatMoney', (amount: unknown, currency?: unknown) => {
      if (amount === null || amount === undefined) return '';
      const cur = typeof currency === 'string' ? currency : '₽';

      return `${Number(amount).toLocaleString('ru-RU')} ${cur}`;
    });

    Handlebars.registerHelper('formatPhone', (phone: string) => {
      if (!phone) return '';
      const cleaned = phone.replace(/\D/g, '');

      if (cleaned.length === 11) {
        return `+${cleaned[0] ?? ''} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
      }

      return phone;
    });
  }
}
