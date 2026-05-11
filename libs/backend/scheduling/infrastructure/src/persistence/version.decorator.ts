import { Property } from '@mikro-orm/core';

export function Version(): ReturnType<typeof Property> {
  return Property({ version: true });
}
