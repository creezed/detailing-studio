import type { TemplatePayload } from '@det/backend-notifications-domain';

export interface ITemplateRenderer {
  render(templateBody: string, payload: TemplatePayload): Promise<string>;
}

export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');
