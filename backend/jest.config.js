module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'Elevare – Unit Test Results',
        outputPath: '/Users/rajak/Downloads/BIT Year 3/Elevare/backend/test-report/index.html',
        includeFailureMsg: true,
        includeConsoleLog: false,
        sort: 'titleAsc',
        dateFormat: 'dd/mm/yyyy HH:MM:ss',
        theme: 'lightTheme',
      },
    ],
  ],
};
