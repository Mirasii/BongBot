
const youCommand = require('../../src/commands/you');
const { SlashCommandBuilder } = require('discord.js');

describe('you command', () => {
    it('should have a data property', () => {
        expect(youCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "you"', () => {
        expect(youCommand.data.name).toBe('you');
    });

    it('should have a description', () => {
        expect(youCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(youCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with you.mp4 as attachment', async () => {
        const result = await youCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('you.mp4');
    });
});
