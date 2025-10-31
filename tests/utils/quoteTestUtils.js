/**
 * @fileoverview Shared utilities for quote database command testing
 */

const { testCommandStructure } = require('./commandStructureTestUtils.js');
jest.mock('../../src/helpers/quoteBuilder.js', () => ({
    getQuote: jest.fn(),
}));

// Mock the ERROR_BUILDER module
jest.mock('../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
}));
/**
 * Creates a standardized test suite for quote commands
 * @param {Object} command - The command module to test
 * @param {string} commandName - The name of the command for structure testing
 * @param {string} expectedTitle - The expected title passed to getQuote
 * @param {string} expectedEndpoint - The expected API endpoint passed to getQuote
 */
function testQuoteCommand(command, commandName, expectedTitle, expectedEndpoint) {
    // Test standard command structure
    testCommandStructure(command, commandName);

    describe(`${commandName} command execution`, () => {
        const mockInteraction = {};
        const mockClient = {};
        
        // Create mocks that can be accessed within tests
        let getQuoteMock;
        let buildErrorMock;

        beforeEach(() => {
            // Get the mocked functions
            getQuoteMock = require('../../src/helpers/quoteBuilder.js').getQuote;
            buildErrorMock = require('../../src/helpers/errorBuilder.js').buildError;
            // Clear all mocks
            if (getQuoteMock.mockClear) getQuoteMock.mockClear();
            if (buildErrorMock.mockClear) buildErrorMock.mockClear();
        });

        test('should return the result from getQuote', async () => {
            const mockResult = 'Mocked Quote Embed';
            getQuoteMock.mockResolvedValueOnce(mockResult);
            const result = await command.execute(mockInteraction, mockClient);
            
            expect(getQuoteMock).toHaveBeenCalledWith(
                expectedTitle,
                mockInteraction,
                expectedEndpoint,
                mockClient
            );
            expect(result).toBe(mockResult);
        });

        test('should return the result from errorBuilder when getQuote errors', async () => {
            const mockError = new Error("Test error");
            getQuoteMock.mockRejectedValueOnce(mockError);
            buildErrorMock.mockResolvedValueOnce('Mocked Error Embed');
            
            const result = await command.execute(mockInteraction, mockClient);
            
            expect(buildErrorMock).toHaveBeenCalledWith(
                mockInteraction,
                mockError
            );
            expect(result).toBe('Mocked Error Embed');
        });
    });
}

/**
 * Create a standard mock interaction for quote commands (legacy)
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
 * Standard test setup for quote database commands (legacy)
 * @param {Object} command - The command module to test
 * @param {string} commandName - Name of the command
 */
const setupQuoteCommandTest = (command, commandName) => {
    testCommandStructure(command, commandName);
};

module.exports = {
    createMockQuoteInteraction,
    setupQuoteCommandTest,
    testQuoteCommand
};
