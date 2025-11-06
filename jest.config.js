module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    transform: {
        '^.+\.js$': 'babel-jest',
        '^.+\.(ts|tsx)$': 'ts-jest',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(msw|@mswjs|@bundled-es-modules|until-async|strict-event-emitter|outvariant|@inquirer|statuses)/)'
    ],
    collectCoverage: true,
    collectCoverageFrom: ["**/*.{js,ts,vue}", "!**/node_modules/**"],
    coverageReporters: ["text", "text-summary", "json", "json-summary", "lcov"],
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: [
        "/babel.config.js",
        "/jest.config.js",
        "/tests/utils/*",
        "/tests/mocks/*",
        "/coverage/*"
    ],
    reporters: [
        "default",
        [
            "jest-junit",
            {
                outputDirectory: "./test-results",
                outputName: "junit.xml",
                ancestorSeparator: " › ",
                uniqueOutputName: "false",
                suiteNameTemplate: "{filepath}",
                classNameTemplate: "{classname}",
                titleTemplate: "{title}"
            }
        ]
    ]
};