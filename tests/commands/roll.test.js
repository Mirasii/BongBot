
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testCommandStructure } = require('../utils/commandStructureTestUtils.js');

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

// Setup standard mock cleanup
setupMockCleanup();

const rollCommand = require('../../src/commands/roll');

// Test standard command structure
testCommandStructure(rollCommand, 'roll');

describe('roll command execution', () => {
    it('should return an object with roll.mp4 as attachment', async () => {
        const result = await rollCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
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

