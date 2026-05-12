import { TemplatePayload } from '@det/backend-notifications-domain';

import { HandlebarsTemplateRenderer } from './handlebars-template-renderer.adapter';
import { MjmlEmailRenderer } from './mjml-email-renderer.adapter';

describe('MjmlEmailRenderer', () => {
  let renderer: MjmlEmailRenderer;

  beforeEach(() => {
    const hbs = new HandlebarsTemplateRenderer();

    renderer = new MjmlEmailRenderer(hbs);
  });

  it('renders MJML template to HTML and text', async () => {
    const mjmlBody = `<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Привет, {{name}}!</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

    const result = await renderer.render(mjmlBody, TemplatePayload.from({ name: 'Иван' }));

    expect(result.html).toContain('Привет, Иван!');
    expect(result.html).toContain('<!doctype html>');
    expect(result.text).toContain('Привет, Иван!');
  });

  it('renders with empty payload without errors', async () => {
    const mjmlBody = `<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Без данных</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

    const result = await renderer.render(mjmlBody, TemplatePayload.from({}));

    expect(result.html).toContain('Без данных');
    expect(result.text).toContain('Без данных');
  });
});
