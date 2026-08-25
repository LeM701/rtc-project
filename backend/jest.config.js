module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/tests/integration/'],
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
};
