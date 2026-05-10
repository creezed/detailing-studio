export default {
  displayName: 'backend-crm-application',
  moduleFileExtensions: ['ts', 'js', 'html'],
  preset: '../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};
