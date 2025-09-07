
const rollCommand = require('../../src/commands/roll');
const { SlashCommandBuilder } = require('discord.js');

describe('roll command', () => {
    it('should have a data property', () => {
        expect(rollCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "roll"', () => {
        expect(rollCommand.data.name).toBe('roll');
    });

    it('should have a description', () => {
        expect(rollCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(rollCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with roll.mp4 as attachment', async () => {
        const result = await rollCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('roll.mp4');
    });
});
