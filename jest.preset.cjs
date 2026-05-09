const path = require('node:path');

const nxPreset = require('@nx/jest/preset').default;

const root = __dirname;
const lib = (/** @type {string} */ p) => path.join(root, p);

module.exports = {
  ...nxPreset,
  moduleNameMapper: {
    ...(nxPreset.moduleNameMapper || {}),
    '^@det/backend-catalog-application$': lib('libs/backend/catalog/application/src/index.ts'),
    '^@det/backend-catalog-domain$': lib('libs/backend/catalog/domain/src/index.ts'),
    '^@det/backend-catalog-infrastructure$': lib('libs/backend/catalog/infrastructure/src/index.ts'),
    '^@det/backend-catalog-interfaces$': lib('libs/backend/catalog/interfaces/src/index.ts'),
    '^@det/backend-iam-application$': lib('libs/backend/iam/application/src/index.ts'),
    '^@det/backend-iam-domain$': lib('libs/backend/iam/domain/src/index.ts'),
    '^@det/backend-iam-infrastructure$': lib('libs/backend/iam/infrastructure/src/index.ts'),
    '^@det/backend-iam-interfaces$': lib('libs/backend/iam/interfaces/src/index.ts'),
    '^@det/backend-shared-auth$': lib('libs/backend/shared/auth/src/index.ts'),
    '^@det/backend-shared-ddd$': lib('libs/backend/shared/ddd/src/index.ts'),
    '^@det/backend-shared-outbox$': lib('libs/backend/shared/outbox/src/index.ts'),
    '^@det/backend-shared-querying$': lib('libs/backend/shared/querying/src/index.ts'),
    '^@det/shared-contracts$': lib('libs/shared/contracts/src/index.ts'),
    '^@det/shared-types$': lib('libs/shared/types/src/index.ts'),
    '^@det/shared-util$': lib('libs/shared/util-pure/src/index.ts'),
  },
};
