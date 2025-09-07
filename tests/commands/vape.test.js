
const vapeCommand = require('../../src/commands/vape');
const { SlashCommandBuilder } = require('discord.js');

describe('vape command', () => {
    it('should have a data property', () => {
        expect(vapeCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "vape"', () => {
        expect(vapeCommand.data.name).toBe('vape');
    });

    it('should have a description', () => {
        expect(vapeCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(vapeCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with vape.mp4 as attachment', async () => {
        const result = await vapeCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('vape.mp4');
    });
});
