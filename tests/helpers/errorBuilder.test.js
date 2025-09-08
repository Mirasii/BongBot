const { MessageFlags, Colors } = require('discord.js');
const { setupMockCleanup } = require('../utils/testSetup.js');

const errorBuilder = require('../../src/helpers/errorBuilder.js');

// Mock the LOGGER module
jest.mock('../../src/helpers/logging.js', () => ({
    log: jest.fn(),
}));

// Mock the EMBED_BUILDER module
jest.mock('../../src/helpers/embedBuilder.js', () => ({
    EMBED_BUILDER: jest.fn().mockImplementation(() => {
        const mockEmbedInstance = {
            setTitle: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
            toJSON: jest.fn().mockImplementation(() => ({
                mockEmbed: true,
                title: mockEmbedInstance.setTitle.mock.calls[0]?.[0] || '',
                color: mockEmbedInstance.setColor.mock.calls[0]?.[0] || null,
            })),
        };
        return {
            constructEmbedWithRandomFile: jest.fn().mockResolvedValue({
                embeds: [mockEmbedInstance],
                files: [{ name: 'mockFile.png' }],
            }),
        };
    }),
}));

// Mock discord.js for MessageFlags and Colors
jest.mock('discord.js', () => ({
    MessageFlags: {
        Ephemeral: 1 << 6,
    },
    Colors: {
        Red: '#FF0000',
    },
}));

// Setup standard mock cleanup
setupMockCleanup();

describe('errorBuilder helper', () => {
    beforeEach(() => {
        // Mock console.error to prevent actual logging during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('buildError should correctly build an error embed with command name', async () => {
        const mockInteraction = { commandName: 'testCommand' };
        const mockError = new Error('Test Error Message');

        const result = await errorBuilder.buildError(mockInteraction, mockError);

        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith(mockError);
        expect(require('../../src/helpers/embedBuilder.js').EMBED_BUILDER).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            embeds: [{
                mockEmbed: true,
                title: 'There was an error while executing the "testCommand" command.',
                color: '#FF0000',
            }],
            files: [{ name: 'mockFile.png' }],
            flags: MessageFlags.Ephemeral,
            isError: true,
        });
    });

    test('buildError should correctly build an error embed for unknown command', async () => {
        const mockInteraction = { commandName: undefined }; // Simulate unknown command
        const mockError = new Error('Test Error Message');

        const result = await errorBuilder.buildError(mockInteraction, mockError);

        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith(mockError);
        expect(require('../../src/helpers/embedBuilder.js').EMBED_BUILDER).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            embeds: [{
                mockEmbed: true,
                title: 'There was an error while executing the "unknown" command.',
                color: '#FF0000',
            }],
            files: [{ name: 'mockFile.png' }],
            flags: MessageFlags.Ephemeral,
            isError: true,
        });
    });

    test('buildUnknownError should correctly build an error embed with default message', async () => {
        const mockError = new Error('Unexpected Error');

        const result = await errorBuilder.buildUnknownError(mockError);

        expect(require('../../src/helpers/logging.js').log).toHaveBeenCalledWith(mockError);
        expect(require('../../src/helpers/embedBuilder.js').EMBED_BUILDER).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            embeds: [{
                mockEmbed: true,
                title: 'Leave me alone! I\'m not talking to you! (there was an unexpected error)',
                color: '#FF0000',
            }],
            files: [{ name: 'mockFile.png' }],
            flags: MessageFlags.Ephemeral,
            isError: true,
        });
    });
});
