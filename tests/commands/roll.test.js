
const { setupMediaCommandTest } = require('../utils/commandTestUtils');

// Note: roll command has a special filename different from command name
const fs = require('fs');

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

// Mock the error builder to avoid deep dependencies
jest.mock('../../src/helpers/errorBuilder', () => ({
    buildError: jest.fn().mockResolvedValue({
        embeds: [],
        files: [],
        flags: 64,
        isError: true
    })
}));

const rollCommand = require('../../src/commands/roll');

describe('roll command', () => {
    const { testCommandStructure, testMediaCommand } = require('../utils/commandTestUtils');

    // Test command structure
    testCommandStructure(rollCommand, 'roll', 'koroneroll.mp4');

    // Test media functionality with custom filename
    describe('media command functionality', () => {
        it('should return an object with koroneroll.mp4 as attachment', async () => {
            const result = await rollCommand.execute();
            expect(result).toHaveProperty('files');
            expect(result.files[0]).toHaveProperty('attachment');
            expect(result.files[0]).toHaveProperty('name');
            expect(result.files[0].name).toBe('koroneroll.mp4');
        });

        it('should handle error scenarios', async () => {
            fs.readFileSync.mockImplementationOnce(() => {
                throw new Error('File read error');
            });

            const mockInteraction = {
                commandName: 'roll'
            };

            const result = await rollCommand.execute(mockInteraction);
            expect(result).toHaveProperty('isError', true);
            expect(result).toHaveProperty('embeds');
            expect(result).toHaveProperty('files');
            expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
        });
    });
});

