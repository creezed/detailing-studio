export default {
  displayName: 'backend-shared-outbox',
  moduleFileExtensions: ['ts', 'js', 'html'],
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};
