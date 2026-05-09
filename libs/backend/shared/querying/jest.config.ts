export default {
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/index.ts', '!jest.config.ts'],
  coverageDirectory: '../../../../coverage/libs/backend/shared/querying',
  displayName: 'backend-shared-querying',
  moduleFileExtensions: ['ts', 'js', 'html'],
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};
