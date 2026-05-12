import type { Brand } from '@det/shared-types';

export type TemplatePayload = Brand<
  Readonly<Record<string, string | number | boolean | null>>,
  'TemplatePayload'
>;

export const TemplatePayload = {
  from(value: Record<string, string | number | boolean | null>): TemplatePayload {
    return Object.freeze({ ...value }) as TemplatePayload;
  },
};
