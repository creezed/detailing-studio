import { ID_GENERATOR } from './id-generator.port';

import type { IIdGenerator } from './id-generator.port';

class FixedIdGenerator implements IIdGenerator {
  constructor(private readonly id: string) {}

  generate(): string {
    return this.id;
  }
}

describe('IIdGenerator', () => {
  it('provides ids through a port', () => {
    const generator: IIdGenerator = new FixedIdGenerator('id-1');

    expect(ID_GENERATOR.description).toBe('ID_GENERATOR');
    expect(generator.generate()).toBe('id-1');
  });
});
