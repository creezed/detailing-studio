import { Entity } from './entity';

class TestEntity extends Entity {
  constructor(private readonly entityId: string) {
    super();
  }

  override get id(): string {
    return this.entityId;
  }
}

describe('Entity', () => {
  it('compares entities by id', () => {
    expect(new TestEntity('id-1').equals(new TestEntity('id-1'))).toBe(true);
    expect(new TestEntity('id-1').equals(new TestEntity('id-2'))).toBe(false);
  });

  it('returns false for nullish values', () => {
    const entity = new TestEntity('id-1');
    const entities = new Map<string, TestEntity>();

    expect(entity.equals(null)).toBe(false);
    expect(entity.equals(entities.get('missing'))).toBe(false);
  });
});
