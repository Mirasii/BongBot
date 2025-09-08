
const { SlashCommandBuilder } = require('discord.js');
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

const funkCommand = require('../../src/commands/funk');
describe('funk command', () => {
    it('should have a data property', () => {
        expect(funkCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "funk"', () => {
        expect(funkCommand.data.name).toBe('funk');
    });

    it('should have a description', () => {
        expect(funkCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(funkCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with funk.mp4 as attachment', async () => {
        const result = await funkCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('funk.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'funk'
        };

        const result = await funkCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

