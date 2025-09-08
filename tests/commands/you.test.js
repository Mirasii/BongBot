
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testEmbedCommand } = require('../utils/commandStructureTestUtils.js');

const youCommand = require('../../src/commands/you');

// Mock embedBuilder
const mockBuild = jest.fn().mockResolvedValue({ files: [{ attachment: 'mock-attachment', name: 'you.png' }] });
const mockConstructEmbedWithImage = jest.fn().mockReturnValue({ build: mockBuild });

jest.mock('../../src/helpers/embedBuilder.js', () => ({
    EMBED_BUILDER: jest.fn().mockImplementation(() => ({
        constructEmbedWithImage: mockConstructEmbedWithImage
    }))
}));

jest.mock('../../src/helpers/errorBuilder', () => ({
    buildError: jest.fn().mockResolvedValue({
        embeds: [],
        files: [],
        flags: 64,
        isError: true
    })
}));

// Setup standard mock cleanup
setupMockCleanup();

// Test standard Embed command structure
testEmbedCommand(youCommand, 'you');

describe('you command execution', () => {
    it('should return the correct file object', async () => {
        const mockInteraction = {};
        const result = await youCommand.execute(mockInteraction);
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('you.png');
    });

    it('should handle error scenarios', async () => {
        // Make the build function throw an error for this test
        mockBuild.mockRejectedValueOnce(new Error('Build failed'));

        const mockInteraction = {
            commandName: 'you'
        };

        const result = await youCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});
