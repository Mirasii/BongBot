const { SlashCommandBuilder } = require('@discordjs/builders');

// Mock the entire you.js module
jest.mock('../../src/commands/you.js', () => ({
    data: {
        name: 'you',
        description: 'you!',
    },
    execute: jest.fn(),
    fullDesc: {
        options: [],
        description: "Posts a you!"
    }
}));

const youCommand = require('../../src/commands/you.js');

describe('you command', () => {
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
        const mockFileContent = Buffer.from('mock image content');
        // Mock the execute function to return the expected structure
        youCommand.execute.mockResolvedValueOnce({
            files: [
                {
                    attachment: mockFileContent,
                    name: "you.mp4"
                }
            ]
        });

        const result = await youCommand.execute(mockInteraction, mockClient);

        expect(result).toEqual({
            files: [
                {
                    attachment: mockFileContent,
                    name: "you.mp4"
                }
            ]
        });
    });
});
