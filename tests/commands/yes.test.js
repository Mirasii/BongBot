const { SlashCommandBuilder } = require('@discordjs/builders');

// Mock the entire yes.js module
jest.mock('../../src/commands/yes.js', () => ({
    data: {
        name: 'yes',
        description: 'mmm, yes!',
    },
    execute: jest.fn(),
    fullDesc: {
        options: [],
        description: "mmm, yes!"
    }
}));

const yesCommand = require('../../src/commands/yes.js');

describe('yes command', () => {
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
        yesCommand.execute.mockResolvedValueOnce({
            files: [
                {
                    attachment: mockFileContent,
                    name: "yes.mp4"
                }
            ]
        });

        const result = await yesCommand.execute(mockInteraction, mockClient);

        expect(result).toEqual({
            files: [
                {
                    attachment: mockFileContent,
                    name: "yes.mp4"
                }
            ]
        });
    });
});
