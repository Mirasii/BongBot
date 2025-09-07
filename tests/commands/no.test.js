
const noCommand = require('../../src/commands/no');
const { SlashCommandBuilder } = require('discord.js');

describe('no command', () => {
    it('should have a data property', () => {
        expect(noCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "no"', () => {
        expect(noCommand.data.name).toBe('no');
    });

    it('should have a description', () => {
        expect(noCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(noCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await noCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('no.mp4');
    });
});
