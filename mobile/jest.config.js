module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(expo|expo-modules-core|@react-native|@react-native-camera-roll|react-native)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/../../packages/config/src/$1',
    '^@types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@validation/(.*)$': '<rootDir>/../../packages/validation/src/$1',
    '^@api-client/(.*)$': '<rootDir>/../../packages/api-client/src/$1',
    '^@utils/(.*)$': '<rootDir>/../../packages/utils/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
};
