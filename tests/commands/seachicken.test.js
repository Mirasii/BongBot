
const seachickenCommand = require('../../src/commands/seachicken');
const { SlashCommandBuilder } = require('discord.js');

describe('seachicken command', () => {
    it('should have a data property', () => {
        expect(seachickenCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "sea"', () => {
        expect(seachickenCommand.data.name).toBe('sea');
    });

    it('should have a description', () => {
        expect(seachickenCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(seachickenCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with seachicken.mp4 as attachment', async () => {
        const result = await seachickenCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('SeaChicken.mp4');
    });
});
