/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Pretext is ESM-only; redirect to a CJS-compatible mock for Jest
    '^@chenglou/pretext$': '<rootDir>/src/__mocks__/@chenglou/pretext.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
};

module.exports = config;
