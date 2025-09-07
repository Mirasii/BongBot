
const danceCommand = require('../../src/commands/dance');
const { SlashCommandBuilder } = require('discord.js');

describe('dance command', () => {
    it('should have a data property', () => {
        expect(danceCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "dance"', () => {
        expect(danceCommand.data.name).toBe('dance');
    });

    it('should have a description', () => {
        expect(danceCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(danceCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await danceCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('dance.mp4');
    });
});
