export default {
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/index.ts', '!jest.config.ts'],
  coverageThreshold: {
    global: {
      statements: 0,
    },
  },
  displayName: 'work-order-application',
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/backend/work-order/application',
};
