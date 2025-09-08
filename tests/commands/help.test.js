
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testCommandStructure, createMockInteraction, createMockClient } = require('../utils/commandTestUtils.js');

const helpCommand = require('../../src/commands/help');

// Setup standard mock cleanup
setupMockCleanup();

// Test standard command structure
testCommandStructure(helpCommand, 'help');

describe('help command execution', () => {
    it('should return a list of commands when no command is specified', async () => {
        const mockCommands = new Map();
        mockCommands.set('command1', { data: { name: 'command1' } });
        mockCommands.set('command2', { data: { name: 'command2' } });

        const mockClient = createMockClient({
            commands: mockCommands,
        });

        const interaction = createMockInteraction({
            options: {
                getString: jest.fn().mockReturnValue(null),
            },
        });

        const result = await helpCommand.execute(interaction, mockClient);

        expect(result).toHaveProperty('embeds');
        expect(result.embeds[0].fields[0].value).toBe('command1\ncommand2');
    });

    it('should return detailed help for a specified command', async () => {
        const mockCommands = new Map();
        mockCommands.set('testcommand', {
            data: { name: 'testcommand' },
            fullDesc: {
                description: 'This is a test command.',
                options: [
                    { name: 'option1', description: 'Description for option 1' },
                    { name: 'option2', description: 'Description for option 2' },
                ],
            },
        });

        const mockClient = createMockClient({
            commands: mockCommands,
        });

        const interaction = createMockInteraction({
            options: {
                getString: jest.fn().mockReturnValue('testcommand'),
            },
        });

        const result = await helpCommand.execute(interaction, mockClient);

        expect(result).toHaveProperty('embeds');
        expect(result.embeds[0].title).toBe('testcommand');
        expect(result.embeds[0].description).toBe('This is a test command.');
        expect(result.embeds[0].fields[0].value).toBe('option1: Description for option 1\noption2: Description for option 2');
    });

    it('should return a message for commands without full description', async () => {
        const mockCommands = new Map();
        mockCommands.set('testcommand', {
            data: { name: 'testcommand' },
        });

        const mockClient = createMockClient({
            commands: mockCommands,
        });

        const interaction = createMockInteraction({
            options: {
                getString: jest.fn().mockReturnValue('testcommand'),
            },
        });

        const result = await helpCommand.execute(interaction, mockClient);

        expect(result).toHaveProperty('embeds');
        expect(result.embeds[0].description).toBe('descriptive help not yet implemented for testcommand');
    });

    it('should handle commands with no options', async () => {
        const mockCommands = new Map();
        mockCommands.set('simplecommand', {
            data: { name: 'simplecommand' },
            fullDesc: {
                description: 'A simple command with no options.',
                options: [],
            },
        });

        const mockClient = createMockClient({
            commands: mockCommands,
        });

        const interaction = createMockInteraction({
            options: {
                getString: jest.fn().mockReturnValue('simplecommand'),
            },
        });

        const result = await helpCommand.execute(interaction, mockClient);

        expect(result).toHaveProperty('embeds');
        expect(result.embeds[0].title).toBe('simplecommand');
        expect(result.embeds[0].description).toBe('A simple command with no options.');
        // Should not have an options field since there are no options
        expect(result.embeds[0].fields).toBeUndefined();
    });

});
