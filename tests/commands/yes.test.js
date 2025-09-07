
const yesCommand = require('../../src/commands/yes');
const { SlashCommandBuilder } = require('discord.js');

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
});
