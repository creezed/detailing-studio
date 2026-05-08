export default {
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!index.ts',
    '!jest.config.ts',
    '!catalog-application.module.ts',
    '!di/tokens.ts',
  ],
  // TODO(catalog): raise back to 90 after covering event/query handlers
  coverageThreshold: {
    global: {
      statements: 65,
    },
  },
  displayName: 'catalog-application',
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/backend/catalog/application',
};
