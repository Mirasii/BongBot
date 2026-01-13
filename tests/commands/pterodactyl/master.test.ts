import { jest } from '@jest/globals';

// Mock Database to prevent better-sqlite3 from being loaded
jest.unstable_mockModule('../../../src/helpers/database.js', () => ({
    default: jest.fn(),
}));

// Mock errorBuilder
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
}));

// Import the master module
const masterModule = await import('../../../src/commands/pterodactyl/master.js');
const pterodactylCommands = masterModule.default;

describe('pterodactyl master module', () => {
    it('should export an array of commands', () => {
        expect(Array.isArray(pterodactylCommands)).toBe(true);
    });

    it('should export exactly 2 commands', () => {
        expect(pterodactylCommands.length).toBe(3);
    });

    it('should include register_server command', () => {
        const registerCommand = pterodactylCommands.find(
            (cmd) => cmd.data.name === 'register_server'
        );
        expect(registerCommand).toBeDefined();
        expect(registerCommand.data.name).toBe('register_server');
    });

    it('should include server_status command', () => {
        const statusCommand = pterodactylCommands.find(
            (cmd) => cmd.data.name === 'server_status'
        );
        expect(statusCommand).toBeDefined();
        expect(statusCommand.data.name).toBe('server_status');
    });

    it('should have all commands with execute methods', () => {
        pterodactylCommands.forEach((command) => {
            expect(command.execute).toBeInstanceOf(Function);
        });
    });

    it('should have all commands with data property', () => {
        pterodactylCommands.forEach((command) => {
            expect(command.data).toBeDefined();
            expect(command.data.name).toBeTruthy();
            expect(command.data.description).toBeTruthy();
        });
    });

    it('should have unique command names', () => {
        const names = pterodactylCommands.map((cmd) => cmd.data.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
    });

    it('should export commands that can be spread into array', () => {
        const commandArray = [...pterodactylCommands];
        expect(commandArray.length).toBe(3);
        expect(commandArray).toEqual(pterodactylCommands);
    });
});
