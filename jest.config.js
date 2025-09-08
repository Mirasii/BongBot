module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    transform: {
        '^.+\.js$': 'babel-jest',
    },
    collectCoverage: true,
    collectCoverageFrom: ["**/*.{js,vue}", "!**/node_modules/**"],
    coverageReporters: ["text", "text-summary", "json", "json-summary", "lcov"],
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: [
        "/babel.config.js",
        "/jest.config.js",
        "/tests/utils/*",
        "/tests/mocks/*",
        "/coverage/*"
    ]
};