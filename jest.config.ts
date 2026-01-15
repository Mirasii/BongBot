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
  collectCoverageFrom: ['src/**/*.{js,ts}', '!**/node_modules/**', '!**/dist/**'],
  coverageReporters: ['text', 'text-summary', 'json', 'json-summary', 'lcov'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/babel.config.js',
    '/jest.config.ts',
    '/tests/utils/*',
    '/tests/mocks/*',
    '/coverage/*',
    '/dist/*',
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

  // Limit worker memory to help with ts-jest memory leak
  // https://github.com/kulshekhar/ts-jest/issues/1967
  workerIdleMemoryLimit: '1024MB',
};

export default config;
