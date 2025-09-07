
const dieCommand = require('../../src/commands/die');
const { SlashCommandBuilder } = require('discord.js');

describe('die command', () => {
    it('should have a data property', () => {
        expect(dieCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "die"', () => {
        expect(dieCommand.data.name).toBe('die');
    });

    it('should have a description', () => {
        expect(dieCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(dieCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await dieCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('die.mp4');
    });
});
