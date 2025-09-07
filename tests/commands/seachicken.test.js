const { SlashCommandBuilder } = require('@discordjs/builders');

// Mock the entire seachicken.js module
jest.mock('../../src/commands/seachicken.js', () => ({
    data: {
        name: 'sea',
        description: 'Sea Chicken!',
    },
    execute: jest.fn(),
    fullDesc: {
        options: [],
        description: "Posts a Sea Chicken!"
    }
}));

const seachickenCommand = require('../../src/commands/seachicken.js');

describe('seachicken command', () => {
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
        seachickenCommand.execute.mockResolvedValueOnce({
            files: [
                {
                    attachment: mockFileContent,
                    name: "SeaChicken.mp4"
                }
            ]
        });

        const result = await seachickenCommand.execute(mockInteraction, mockClient);

        expect(result).toEqual({
            files: [
                {
                    attachment: mockFileContent,
                    name: "SeaChicken.mp4"
                }
            ]
        });
    });
});
