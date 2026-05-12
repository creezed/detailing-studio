import { TemplatePayload } from '@det/backend-notifications-domain';

import { HandlebarsTemplateRenderer } from './handlebars-template-renderer.adapter';

describe('HandlebarsTemplateRenderer', () => {
  let renderer: HandlebarsTemplateRenderer;

  beforeEach(() => {
    renderer = new HandlebarsTemplateRenderer();
  });

  it('renders simple template', async () => {
    const result = await renderer.render(
      'Привет, {{name}}!',
      TemplatePayload.from({ name: 'Иван' }),
    );

    expect(result).toBe('Привет, Иван!');
  });

  it('caches compiled templates', async () => {
    const body = 'Привет, {{name}}!';
    const payload = TemplatePayload.from({ name: 'Анна' });

    await renderer.render(body, payload);
    const result = await renderer.render(body, payload);

    expect(result).toBe('Привет, Анна!');
  });

  it('formats money with formatMoney helper', async () => {
    const result = await renderer.render(
      'Итого: {{formatMoney amount}}',
      TemplatePayload.from({ amount: 1500 }),
    );

    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('₽');
  });

  it('formats phone with formatPhone helper', async () => {
    const result = await renderer.render(
      'Телефон: {{formatPhone phone}}',
      TemplatePayload.from({ phone: '79001234567' }),
    );

    expect(result).toBe('Телефон: +7 (900) 123-45-67');
  });

  it('handles missing values gracefully', async () => {
    const result = await renderer.render(
      'Привет, {{name}}! Ваш телефон: {{formatPhone phone}}',
      TemplatePayload.from({ name: 'Тест' }),
    );

    expect(result).toBe('Привет, Тест! Ваш телефон: ');
  });
});
