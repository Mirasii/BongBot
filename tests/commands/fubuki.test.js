
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testGoogleSearchCommand } = require('../utils/commandStructureTestUtils.js');

const fubukiCommand = require('../../src/commands/fubuki');
const google = require('../../src/helpers/googleSearch.js');
const ERROR_BUILDER = require('../../src/helpers/errorBuilder.js');

jest.mock('../../src/helpers/googleSearch.js');
jest.mock('../../src/helpers/errorBuilder.js');

// Setup standard mock cleanup
setupMockCleanup();

// Test standard Google Search command structure
testGoogleSearchCommand(fubukiCommand, 'fox', 'Shirakami Fubuki');

describe('fubuki command execution', () => {
    it('should return an image URL on success', async () => {
        google.searchImage.mockResolvedValue('http://example.com/fubuki.jpg');
        const result = await fubukiCommand.execute();
        expect(google.searchImage).toHaveBeenCalledWith('Shirakami Fubuki');
        expect(result).toBe('http://example.com/fubuki.jpg');
    });

    it('should return an error message on failure', async () => {
        google.searchImage.mockRejectedValue(new Error('Search failed'));
        ERROR_BUILDER.buildError.mockResolvedValue('Error message');
        const result = await fubukiCommand.execute();
        expect(google.searchImage).toHaveBeenCalledWith('Shirakami Fubuki');
        expect(ERROR_BUILDER.buildError).toHaveBeenCalled();
        expect(result).toBe('Error message');
    });
});
