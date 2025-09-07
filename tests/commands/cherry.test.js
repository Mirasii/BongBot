
const cherryCommand = require('../../src/commands/cherry');
const { SlashCommandBuilder } = require('discord.js');

describe('cherry command', () => {
    it('should have a data property', () => {
        expect(cherryCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "cherry"', () => {
        expect(cherryCommand.data.name).toBe('cherry');
    });

    it('should have a description', () => {
        expect(cherryCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(cherryCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await cherryCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('cherry.mp4');
    });
});
