
const hentaiCommand = require('../../src/commands/hentai');
const { SlashCommandBuilder } = require('discord.js');

describe('hentai command', () => {
    it('should have a data property', () => {
        expect(hentaiCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "hentai"', () => {
        expect(hentaiCommand.data.name).toBe('hentai');
    });

    it('should have a description', () => {
        expect(hentaiCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(hentaiCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await hentaiCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('hentai.mp4');
    });
});
