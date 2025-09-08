/**
 * @fileoverview Common test scenarios and patterns to eliminate duplication
 */

/**
 * Test error handling for a command
 * @param {Function} commandExecute - The command execute function
 * @param {Object} interaction - Mock interaction
 * @param {Object} client - Mock client  
 * @param {Function} errorTriggerFn - Function that should trigger an error
 * @param {string} expectedErrorType - Expected error type to be called
 */
const testErrorHandling = async (commandExecute, interaction, client, errorTriggerFn, expectedErrorType = 'buildError') => {
    // Setup error condition
    errorTriggerFn();

    // Execute command
    const result = await commandExecute(interaction, client);

    // Verify error handling
    const errorBuilder = require('../../src/helpers/errorBuilder.js');
    expect(errorBuilder[expectedErrorType]).toHaveBeenCalled();
    
    if (result?.isError !== undefined) {
        expect(result.isError).toBe(true);
    }
    
    return result;
};

/**
 * Test successful execution pattern for commands
 * @param {Function} commandExecute - The command execute function
 * @param {Object} interaction - Mock interaction
 * @param {Object} client - Mock client
 * @param {Object} expectedResult - Expected result properties
 */
const testSuccessfulExecution = async (commandExecute, interaction, client, expectedResult) => {
    const result = await commandExecute(interaction, client);
    
    // Check common success patterns
    if (expectedResult.hasEmbeds) {
        expect(result).toHaveProperty('embeds');
    }
    
    if (expectedResult.hasFiles) {
        expect(result).toHaveProperty('files');
    }
    
    if (expectedResult.isString) {
        expect(typeof result).toBe('string');
    }
    
    // Check specific expected properties
    if (expectedResult.properties) {
        expectedResult.properties.forEach(prop => {
            expect(result).toHaveProperty(prop.key, prop.value);
        });
    }
    
    return result;
};

/**
 * Common test pattern for commands that use external APIs
 * @param {string} commandName - Name of the command being tested
 * @param {Function} commandExecute - The command execute function
 * @param {Object} mockSetup - Mock setup configuration
 */
const testApiCommand = (commandName, commandExecute, mockSetup) => {
    describe(`${commandName} API integration`, () => {
        it('should handle successful API response', async () => {
            // Setup successful API mock
            if (mockSetup.successMock) {
                mockSetup.successMock();
            }
            
            const result = await testSuccessfulExecution(
                commandExecute,
                mockSetup.interaction,
                mockSetup.client,
                mockSetup.expectedSuccess
            );
            
            return result;
        });
        
        it('should handle API errors gracefully', async () => {
            const result = await testErrorHandling(
                commandExecute,
                mockSetup.interaction,
                mockSetup.client,
                mockSetup.errorTrigger,
                mockSetup.expectedErrorType
            );
            
            return result;
        });
    });
};

/**
 * Common pattern for testing commands with options
 * @param {string} commandName - Name of the command
 * @param {Function} commandExecute - The command execute function
 * @param {Array} optionTests - Array of option test configurations
 */
const testCommandOptions = (commandName, commandExecute, optionTests) => {
    describe(`${commandName} option handling`, () => {
        optionTests.forEach(test => {
            it(`should handle ${test.description}`, async () => {
                const result = await commandExecute(test.interaction, test.client);
                
                if (test.expectations) {
                    test.expectations.forEach(expectation => {
                        expectation(result);
                    });
                }
                
                return result;
            });
        });
    });
};

module.exports = {
    testErrorHandling,
    testSuccessfulExecution,
    testApiCommand,
    testCommandOptions
};
