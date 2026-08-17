module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>', '<rootDir>/../'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/../../packages/config/src/$1',
    '^@types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@validation/(.*)$': '<rootDir>/../../packages/validation/src/$1',
    '^@utils/(.*)$': '<rootDir>/../../packages/utils/src/$1',
  },
};
