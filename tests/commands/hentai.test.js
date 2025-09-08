
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

const HentaiCommand = require('../../src/commands/hentai');
describe('Hentai command', () => {
    it('should have a data property', () => {
        expect(HentaiCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "hentai"', () => {
        expect(HentaiCommand.data.name).toBe('hentai');
    });

    it('should have a description', () => {
        expect(HentaiCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(HentaiCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with Hentai.webm as attachment', async () => {
        const result = await HentaiCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('Hentai.webm');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'Hentai'
        };

        const result = await HentaiCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

