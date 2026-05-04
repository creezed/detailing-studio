import { err, ok } from './result';

describe('Result', () => {
  it('creates ok result', () => {
    const result = ok('value');

    expect(result.ok).toBe(true);
    expect(result.value).toBe('value');
  });

  it('creates err result', () => {
    const result = err('error');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('error');
  });
});
