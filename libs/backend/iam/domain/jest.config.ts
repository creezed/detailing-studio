export default {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/index.ts'],
  coverageThreshold: {
    global: {
      statements: 90,
    },
  },
  displayName: 'iam-domain',
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/backend/iam/domain',
};
