
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));
const yesCommand = require('../../src/commands/yes');

describe('yes command', () => {
    it('should have a data property', () => {
        expect(yesCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "yes"', () => {
        expect(yesCommand.data.name).toBe('yes');
    });

    it('should have a description', () => {
        expect(yesCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(yesCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with yes.mp4 as attachment', async () => {
        const result = await yesCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('yes.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const result = await yesCommand.execute();
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('content');
        expect(result.data.content).toBe('There was an error while executing this command.');
    });
});
