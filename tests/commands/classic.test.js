
const classicCommand = require('../../src/commands/classic');
const { SlashCommandBuilder } = require('discord.js');

describe('classic command', () => {
    it('should have a data property', () => {
        expect(classicCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "classic"', () => {
        expect(classicCommand.data.name).toBe('classic');
    });

    it('should have a description', () => {
        expect(classicCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(classicCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await classicCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('classic.mp4');
    });
});
