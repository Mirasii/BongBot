
const callirapCommand = require('../../src/commands/callirap');
const { SlashCommandBuilder } = require('discord.js');

describe('callirap command', () => {
    it('should have a data property', () => {
        expect(callirapCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "callirap"', () => {
        expect(callirapCommand.data.name).toBe('callirap');
    });

    it('should have a description', () => {
        expect(callirapCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(callirapCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await callirapCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('callirap.mp4');
    });
});
