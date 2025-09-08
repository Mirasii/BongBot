
const pingCommand = require('../../src/commands/ping');
const { SlashCommandBuilder } = require('discord.js');

describe('ping command', () => {
    it('should have a data property', () => {
        expect(pingCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "ping"', () => {
        expect(pingCommand.data.name).toBe('ping');
    });

    it('should have a description', () => {
        expect(pingCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(pingCommand.execute).toBeInstanceOf(Function);
    });

    it('should return "Pong" when executed', async () => {
        const result = await pingCommand.execute();
        expect(result).toBe('Pong');
    });
});
