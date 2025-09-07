
const cringeCommand = require('../../src/commands/cringe');
const { SlashCommandBuilder } = require('discord.js');

describe('cringe command', () => {
    it('should have a data property', () => {
        expect(cringeCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "cringe"', () => {
        expect(cringeCommand.data.name).toBe('cringe');
    });

    it('should have a description', () => {
        expect(cringeCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(cringeCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await cringeCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('cringe.mp4');
    });
});
