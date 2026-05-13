import { Injectable } from '@nestjs/common';
import { convert } from 'html-to-text';
import mjml from 'mjml';

import { HandlebarsTemplateRenderer } from './handlebars-template-renderer.adapter';

export interface EmailRenderResult {
  readonly html: string;
  readonly text: string;
}

@Injectable()
export class MjmlEmailRenderer {
  constructor(private readonly hbs: HandlebarsTemplateRenderer) {}

  async render(
    mjmlHbsBody: string,
    payload: Record<string, string | number | boolean | null>,
  ): Promise<EmailRenderResult> {
    const renderedMjml = await this.hbs.render(
      mjmlHbsBody,
      payload as Parameters<typeof this.hbs.render>[1],
    );

    const { html, errors } = await mjml(renderedMjml, {
      validationLevel: 'soft',
    });

    if (errors.length > 0) {
      const messages = errors
        .map((e: { formattedMessage: string }) => e.formattedMessage)
        .join('; ');

      throw new Error(`MJML rendering errors: ${messages}`);
    }

    const text = convert(html, { wordwrap: 80 });

    return { html, text };
  }
}
