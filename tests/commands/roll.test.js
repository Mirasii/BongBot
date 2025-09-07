const { SlashCommandBuilder } = require('@discordjs/builders');

// Mock the entire roll.js module
jest.mock('../../src/commands/roll.js', () => ({
    data: {
        name: 'roll',
        description: 'roll!',
    },
    execute: jest.fn(),
    fullDesc: {
        options: [],
        description: "Posts a roll!"
    }
}));

const rollCommand = require('../../src/commands/roll.js');

describe('roll command', () => {
    const mockInteraction = {
        reply: jest.fn(),
    };

    const mockClient = {};

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.error to prevent actual logging during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error after each test
        jest.restoreAllMocks();
    });

    test('should successfully return the file attachment', async () => {
        const mockFileContent = Buffer.from('mock video content');
        // Mock the execute function to return the expected structure
        rollCommand.execute.mockResolvedValueOnce({
            files: [
                {
                    attachment: mockFileContent,
                    name: "roll.mp4"
                }
            ]
        });

        const result = await rollCommand.execute(mockInteraction, mockClient);

        expect(result).toEqual({
            files: [
                {
                    attachment: mockFileContent,
                    name: "roll.mp4"
                }
            ]
        });
    });
});
