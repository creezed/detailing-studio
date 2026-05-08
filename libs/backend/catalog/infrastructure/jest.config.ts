export default {
  displayName: 'catalog-infrastructure',
  moduleFileExtensions: ['ts', 'js', 'html'],
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  testTimeout: 60_000,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};
