
const creeperCommand = require('../../src/commands/creeper');
const { SlashCommandBuilder } = require('discord.js');

describe('creeper command', () => {
    it('should have a data property', () => {
        expect(creeperCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "creeper"', () => {
        expect(creeperCommand.data.name).toBe('creeper');
    });

    it('should have a description', () => {
        expect(creeperCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(creeperCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await creeperCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('creeper.webm');
    });
});
