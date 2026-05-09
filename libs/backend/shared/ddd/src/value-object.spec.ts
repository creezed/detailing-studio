import { ValueObject } from './value-object';

class TestValueObject extends ValueObject {
  constructor(private readonly value: string) {
    super();
  }

  override equals(other: this): boolean {
    return this.value === other.value;
  }
}

describe('ValueObject', () => {
  it('requires value-based equality implementation', () => {
    expect(new TestValueObject('value').equals(new TestValueObject('value'))).toBe(true);
    expect(new TestValueObject('value').equals(new TestValueObject('other'))).toBe(false);
  });
});
