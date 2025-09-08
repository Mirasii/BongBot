
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testInfoCardCommand } = require('../utils/commandStructureTestUtils.js');

const infoCommand = require('../../src/commands/info');
const { generateCard } = require('../../src/helpers/infoCard.js');
const ERROR_BUILDER = require('../../src/helpers/errorBuilder.js');

jest.mock('../../src/helpers/infoCard.js');
jest.mock('../../src/helpers/errorBuilder.js');

// Setup standard mock cleanup
setupMockCleanup();

// Test standard Info Card command structure
testInfoCardCommand(infoCommand, 'info');

describe('info command execution', () => {
    it('should return an embed on success', async () => {
        const mockEmbed = { title: 'Test Embed' };
        generateCard.mockResolvedValue(mockEmbed);
        const result = await infoCommand.execute();
        expect(generateCard).toHaveBeenCalled();
        expect(result).toEqual({ embeds: [mockEmbed] });
    });

    it('should return an error message on failure', async () => {
        generateCard.mockRejectedValue(new Error('Card generation failed'));
        ERROR_BUILDER.buildError.mockResolvedValue('Error message');
        const result = await infoCommand.execute();
        expect(generateCard).toHaveBeenCalled();
        expect(ERROR_BUILDER.buildError).toHaveBeenCalled();
        expect(result).toBe('Error message');
    });
});
