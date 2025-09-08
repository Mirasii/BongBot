
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

// Mock the error builder to avoid deep dependencies
jest.mock('../../src/helpers/errorBuilder', () => ({
    buildError: jest.fn().mockResolvedValue({
        embeds: [],
        files: [],
        flags: 64,
        isError: true
    })
}));

const seachickenCommand = require('../../src/commands/seachicken');
describe('seachicken command', () => {
    it('should have a data property', () => {
        expect(seachickenCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "seachicken"', () => {
        expect(seachickenCommand.data.name).toBe('sea');
    });

    it('should have a description', () => {
        expect(seachickenCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(seachickenCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with SeaChicken.mp4 as attachment', async () => {
        const result = await seachickenCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('SeaChicken.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'seachicken'
        };

        const result = await seachickenCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

