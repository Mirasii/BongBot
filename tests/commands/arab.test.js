
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));
const arabCommand = require('../../src/commands/arab');
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

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const result = await arabCommand.execute();
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('content');
        expect(result.data.content).toBe('There was an error while executing this command.');
    });
});

