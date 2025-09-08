
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

const yesCommand = require('../../src/commands/yes');
describe('yes command', () => {
    it('should have a data property', () => {
        expect(yesCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "yes"', () => {
        expect(yesCommand.data.name).toBe('yes');
    });

    it('should have a description', () => {
        expect(yesCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(yesCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with yes.mp4 as attachment', async () => {
        const result = await yesCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('yes.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'yes'
        };

        const result = await yesCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

