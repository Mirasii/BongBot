/**
 * @fileoverview Test configuration utilities for consistent test setup
 */

/**
 * Standard Jest configuration for different types of commands
 */
const TEST_CONFIGS = {
    // Configuration for media commands (commands that return files)
    MEDIA_COMMAND: {
        mocks: ['fs', 'errorBuilder'],
        setupFunctions: ['mockFs', 'mockErrorBuilder'],
        testTypes: ['structure', 'media']
    },
    
    // Configuration for API commands (commands that make HTTP requests)
    API_COMMAND: {
        mocks: ['caller', 'errorBuilder'],
        setupFunctions: ['setupStandardTestEnvironment'],
        testTypes: ['structure', 'api']
    },
    
    // Configuration for simple commands (basic functionality)
    SIMPLE_COMMAND: {
        mocks: [],
        setupFunctions: ['setupMockCleanup'],
        testTypes: ['structure']
    },
    
    // Configuration for embed commands (commands that return embeds)
    EMBED_COMMAND: {
        mocks: ['embedBuilder'],
        setupFunctions: ['setupMockCleanup'],
        testTypes: ['structure', 'embed']
    }
};

type MockFunction = () => void;
type ConfigMockFunction = (configOverrides?: object) => void;

interface MockConfigs {
  [key: string]: MockFunction | ConfigMockFunction;
}

/**
 * Common mock configurations to avoid repetitive mock setup
 */
const MOCK_CONFIGS: MockConfigs = {
    fs: () => jest.mock('fs', () => ({
        readFileSync: jest.fn()
    })),
    
    errorBuilder: () => jest.mock('../../src/helpers/errorBuilder', () => ({
        buildError: jest.fn().mockResolvedValue({
            embeds: [],
            files: [],
            flags: 64,
            isError: true
        }),
        buildUnknownError: jest.fn()
    })),
    
    caller: () => jest.mock('../../src/helpers/caller', () => ({
        get: jest.fn(),
        post: jest.fn()
    })),
    
    embedBuilder: () => jest.mock('../../src/helpers/embedBuilder', () => ({
        EMBED_BUILDER: jest.fn().mockImplementation(() => ({
            constructEmbedWithRandomFile: jest.fn().mockReturnValue('mocked embed'),
            constructEmbedWithAttachment: jest.fn().mockReturnValue({
                addFooter: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnValue('mocked embed with attachment'),
            })
        }))
    })),
    
    quoteBuilder: () => jest.mock('../../src/helpers/quoteBuilder', () => ({
        QuoteBuilder: jest.fn().mockImplementation(() => ({
            setTitle: jest.fn().mockReturnThis(),
            addQuotes: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnValue('Mocked Quote Embed')
        }))
    })),
    
    config: (configOverrides = {}) => jest.mock('../../src/config/index.js', () => ({
        apis: {
            quotedb: {
                url: "https://quotes.elmu.dev",
                apikey: "mock_api_key", 
                user_id: "mock_user_id"
            },
            openai: {
                active: true,
                url: "https://api.openai.com",
                apikey: "mock_openai_key",
                model: "gpt-4o"
            },
            googleai: {
                active: false,
                url: "https://generativelanguage.googleapis.com",
                apikey: "mock_googleai_key",
                model: "gemini-2.5-flash-lite"
            },
            ...configOverrides
        }
    }))
};

/**
 * Setup mocks based on configuration
 * @param {Array} mockNames - Array of mock names to setup
 * @param {Object} overrides - Override configurations for specific mocks
 */
const setupMocks = (mockNames: Array<string>, overrides: MockConfigs = {}) => {
    mockNames.forEach(mockName => {
        if (MOCK_CONFIGS[mockName]) {
            if (overrides[mockName]) {
                overrides[mockName]();
            } else {
                MOCK_CONFIGS[mockName]();
            }
        }
    });
};

type CommandType = keyof typeof TEST_CONFIGS;

/**
 * Get test configuration for a command type
 * @param {string} commandType - Type of command (MEDIA_COMMAND, API_COMMAND, etc.)
 * @returns {Object} Test configuration
 */
const getTestConfig = (commandType: CommandType) => {
    return TEST_CONFIGS[commandType] || TEST_CONFIGS.SIMPLE_COMMAND;
};

module.exports = {
    TEST_CONFIGS,
    MOCK_CONFIGS,
    setupMocks,
    getTestConfig
};
