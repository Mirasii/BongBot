/**
 * @fileoverview Shared utilities for quote database command testing
 */
import { testCommandStructure } from './commandStructureTestUtils.js';
import { Command } from './interfaces.js';
/**
 * Standard mocks for quote database commands
 */
const setupQuoteMocks = () => {
    // Mock the config module to control API keys and URLs
    jest.mock('../../src/config/index.js', () => ({
        apis: {
            quotedb: {
                url: "https://quotes.elmu.dev",
                apikey: "mock_api_key",
                user_id: "mock_user_id",
            },
        },
    }));

    // Mock the QuoteBuilder to simplify assertions
    jest.mock('../../src/helpers/quoteBuilder.js', () => {
        return {
            QuoteBuilder: jest.fn().mockImplementation(() => {
                return {
                    setTitle: jest.fn().mockReturnThis(),
                    addQuotes: jest.fn().mockReturnThis(),
                    build: jest.fn().mockReturnValue('Mocked Quote Embed'),
                };
            }),
        };
    });

    // Mock the CALLER module
    jest.mock('../../src/helpers/caller.js', () => ({
        get: jest.fn(),
        post: jest.fn(),
    }));

    // Mock the ERROR_BUILDER module
    jest.mock('../../src/helpers/errorBuilder.js', () => ({
        buildError: jest.fn(),
    }));
};

/**
 * Create a standard mock interaction for quote commands
 */
const createMockQuoteInteraction = (getIntegerReturn = null, getStringReturn = null) => {
    return {
        options: {
            getInteger: jest.fn().mockReturnValue(getIntegerReturn),
            getString: jest.fn((optionName) => {
                if (optionName === 'quote' || optionName === 'author') {
                    return getStringReturn;
                }
                return getStringReturn;
            }),
        },
        reply: jest.fn(),
    };
};

/**
 * Standard test setup for quote database commands
 * @param {Object} command - The command module to test
 * @param {string} commandName - Name of the command
 */
const setupQuoteCommandTest = (command: Command, commandName: string) => {
    setupQuoteMocks();
    testCommandStructure(command, commandName);
};

module.exports = {
    setupQuoteMocks,
    createMockQuoteInteraction,
    setupQuoteCommandTest
};
