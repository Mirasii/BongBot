const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

const poggethCommand = require('../../src/commands/poggeth.js');

// Mock fs.readFileSync
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));

describe('poggeth command', () => {
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
        fs.readFileSync.mockReturnValue(mockFileContent);

        const result = await poggethCommand.execute(mockInteraction, mockClient);

        expect(fs.readFileSync).toHaveBeenCalledWith('./src/files/mine_pogethchampion1.mp4');
        expect(result).toEqual({
            files: [
                {
                    attachment: mockFileContent,
                    name: "poggeth.mp4"
                }
            ]
        });
    });

    test('should handle errors during execution', async () => {
        const mockError = new Error('File read error');
        fs.readFileSync.mockImplementation(() => {
            throw mockError;
        });

        const result = await poggethCommand.execute(mockInteraction, mockClient);

        expect(console.error).toHaveBeenCalledWith('poggeth command failed', mockError);
        expect(result).toEqual({
            type: 4,
            data: {
                content: 'There was an error while executing this command.',
                flags: 1 << 6
            }
        });
    });
});
