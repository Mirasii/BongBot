
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

const cherryCommand = require('../../src/commands/cherry');
describe('cherry command', () => {
    it('should have a data property', () => {
        expect(cherryCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "cherry"', () => {
        expect(cherryCommand.data.name).toBe('cherry');
    });

    it('should have a description', () => {
        expect(cherryCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(cherryCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with cherry.mp4 as attachment', async () => {
        const result = await cherryCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('cherry.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'cherry'
        };

        const result = await cherryCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

