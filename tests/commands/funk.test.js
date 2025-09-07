
const funkCommand = require('../../src/commands/funk');
const { SlashCommandBuilder } = require('discord.js');

describe('funk command', () => {
    it('should have a data property', () => {
        expect(funkCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "funk"', () => {
        expect(funkCommand.data.name).toBe('funk');
    });

    it('should have a description', () => {
        expect(funkCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(funkCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const result = await funkCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('funk.mp4');
    });
});
