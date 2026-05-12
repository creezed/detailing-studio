export default {
  displayName: 'notifications-worker',
  preset: '../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.app.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
};
