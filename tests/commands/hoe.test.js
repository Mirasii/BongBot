
const hoeCommand = require('../../src/commands/hoe');
const { SlashCommandBuilder } = require('discord.js');

describe('hoe command', () => {
    it('should have a data property', () => {
        expect(hoeCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "hoe"', () => {
        expect(hoeCommand.data.name).toBe('hoe');
    });

    it('should have a description', () => {
        expect(hoeCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(hoeCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await hoeCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('hoe.mp4');
    });
});
