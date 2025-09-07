
const poggethCommand = require('../../src/commands/poggeth');
const { SlashCommandBuilder } = require('discord.js');

describe('poggeth command', () => {
    it('should have a data property', () => {
        expect(poggethCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "poggeth"', () => {
        expect(poggethCommand.data.name).toBe('poggeth');
    });

    it('should have a description', () => {
        expect(poggethCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(poggethCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with poggeth.mp4 as attachment', async () => {
        const result = await poggethCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('poggeth.mp4');
    });
});
