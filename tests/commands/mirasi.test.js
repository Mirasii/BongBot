
const mirasiCommand = require('../../src/commands/mirasi');
const { SlashCommandBuilder } = require('discord.js');

describe('mirasi command', () => {
    it('should have a data property', () => {
        expect(mirasiCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "mirasi"', () => {
        expect(mirasiCommand.data.name).toBe('mirasi');
    });

    it('should have a description', () => {
        expect(mirasiCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(mirasiCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await mirasiCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('mirasi.mp4');
    });
});
