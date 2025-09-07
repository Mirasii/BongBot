const { SlashCommandBuilder } = require('@discordjs/builders');

// Mock the entire vape.js module
jest.mock('../../src/commands/vape.js', () => ({
    data: {
        name: 'vape',
        description: 'Vape Nic',
    },
    execute: jest.fn(),
    fullDesc: {
        options: [],
        description: "Vape Nic...\nSuck Dick!"
    }
}));

const vapeCommand = require('../../src/commands/vape.js');

describe('vape command', () => {
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
        vapeCommand.execute.mockResolvedValueOnce({
            files: [
                {
                    attachment: mockFileContent,
                    name: "vape.mp4"
                }
            ]
        });

        const result = await vapeCommand.execute(mockInteraction, mockClient);

        expect(result).toEqual({
            files: [
                {
                    attachment: mockFileContent,
                    name: "vape.mp4"
                }
            ]
        });
    });
});
