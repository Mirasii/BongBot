
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testEmbedCommand } = require('../utils/commandStructureTestUtils.js');

const cringeCommand = require('../../src/commands/cringe');

// Mock embedBuilder
const mockBuild = jest.fn().mockResolvedValue({ files: [{ attachment: 'mock-attachment', name: 'cringe.png' }] });
const mockAddDefaultFooter = jest.fn().mockReturnValue({ build: mockBuild });
const mockConstructEmbedWithImage = jest.fn().mockReturnValue({ addDefaultFooter: mockAddDefaultFooter });

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
testEmbedCommand(cringeCommand, 'cringe');

describe('cringe command execution', () => {
    it('should return the correct file object', async () => {
        const mockInteraction = {};
        const mockClient = { version: '1.0.0', user: { displayAvatarURL: jest.fn().mockReturnValue('http://example.com/avatar.png') } };
        
        const result = await cringeCommand.execute(mockInteraction, mockClient);
        
        expect(mockConstructEmbedWithImage).toHaveBeenCalledWith('cringe.png');
        expect(mockAddDefaultFooter).toHaveBeenCalledWith(mockClient);
        expect(mockBuild).toHaveBeenCalled();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('cringe.png');
    });

    it('should handle error scenarios', async () => {
        // Make the build function throw an error for this test
        mockBuild.mockRejectedValueOnce(new Error('Build failed'));

        const mockInteraction = {
            commandName: 'cringe'
        };
        const mockClient = { version: '1.0.0', user: { displayAvatarURL: jest.fn().mockReturnValue('http://example.com/avatar.png') } };

        const result = await cringeCommand.execute(mockInteraction, mockClient);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});
