export default {
  displayName: 'backend-api-e2e',
  preset: '../../../jest.preset.cjs',
  testEnvironment: 'node',
  maxWorkers: 1,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  testMatch: ['**/*.e2e.ts'],
};
