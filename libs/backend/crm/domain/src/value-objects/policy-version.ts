import type { Brand } from '@det/shared-types';

export type PolicyVersion = Brand<string, 'PolicyVersion'>;

export const PolicyVersion = {
  from(value: string): PolicyVersion {
    if (value.trim().length === 0) {
      throw new Error('PolicyVersion cannot be empty');
    }

    return value.trim() as PolicyVersion;
  },
};
