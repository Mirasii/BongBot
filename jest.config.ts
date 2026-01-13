import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',

  // ✅ Handle TypeScript + ESM
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // ✅ Fix imports like "./something.js" inside ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // ✅ Optional resolver for tsconfig paths
  resolver: 'ts-jest-resolver',

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // ✅ Ignore transformation for ESM-compatible node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|@bundled-es-modules|until-async|strict-event-emitter|outvariant|@inquirer|statuses)/)',
  ],

  collectCoverage: true,
  collectCoverageFrom: ['**/*.{js,ts,vue}', '!**/node_modules/**'],
  coverageReporters: ['text', 'text-summary', 'json', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/babel.config.js',
    '/jest.config.ts',
    '/tests/utils/*',
    '/tests/mocks/*',
    '/coverage/*',
  ],

  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // Force exit after test completion to prevent hanging
  forceExit: true,
};

export default config;
