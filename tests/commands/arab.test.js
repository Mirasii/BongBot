
const arabCommand = require('../../src/commands/arab');
const { SlashCommandBuilder } = require('discord.js');

describe('arab command', () => {
    it('should have a data property', () => {
        expect(arabCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "arab"', () => {
        expect(arabCommand.data.name).toBe('arab');
    });

    it('should have a description', () => {
        expect(arabCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(arabCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with arab.mp4 as attachment', async () => {
        const result = await arabCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('arab.mp4');
    });
});
