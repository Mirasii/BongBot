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
const pterodactylCommand = masterModule.default;

describe('pterodactyl master command', () => {
    it('should export a command object', () => {
        expect(pterodactylCommand).toBeDefined();
        expect(typeof pterodactylCommand).toBe('object');
    });

    it('should have data property with SlashCommandBuilder', () => {
        expect(pterodactylCommand.data).toBeDefined();
        expect(pterodactylCommand.data.constructor.name).toBe('SlashCommandBuilder');
    });

    it('should have command name "pterodactyl"', () => {
        expect(pterodactylCommand.data.name).toBe('pterodactyl');
    });

    it('should have a description', () => {
        expect(pterodactylCommand.data.description).toBeTruthy();
        expect(pterodactylCommand.data.description).toContain('Pterodactyl');
    });

    it('should have execute method', () => {
        expect(pterodactylCommand.execute).toBeInstanceOf(Function);
    });

    it('should have setupCollector method', () => {
        expect(pterodactylCommand.setupCollector).toBeInstanceOf(Function);
    });

    it('should have fullDesc property', () => {
        expect(pterodactylCommand.fullDesc).toBeDefined();
        expect(pterodactylCommand.fullDesc.description).toBeTruthy();
        expect(pterodactylCommand.fullDesc.options).toBeDefined();
    });

    it('should have 5 subcommands', () => {
        const commandData = pterodactylCommand.data.toJSON();
        expect(commandData.options).toBeDefined();
        expect(commandData.options?.length).toBe(5);
    });

    it('should have register subcommand', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const registerCmd = commandData.options?.find((opt: any) => opt.name === 'register');
        expect(registerCmd).toBeDefined();
        expect(registerCmd?.type).toBe(1); // SUB_COMMAND type
    });

    it('should have list subcommand', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const listCmd = commandData.options?.find((opt: any) => opt.name === 'list');
        expect(listCmd).toBeDefined();
        expect(listCmd?.type).toBe(1);
    });

    it('should have manage subcommand', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const manageCmd = commandData.options?.find((opt: any) => opt.name === 'manage');
        expect(manageCmd).toBeDefined();
        expect(manageCmd?.type).toBe(1);
    });

    it('should have update subcommand', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const updateCmd = commandData.options?.find((opt: any) => opt.name === 'update');
        expect(updateCmd).toBeDefined();
        expect(updateCmd?.type).toBe(1);
    });

    it('should have remove subcommand', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const removeCmd = commandData.options?.find((opt: any) => opt.name === 'remove');
        expect(removeCmd).toBeDefined();
        expect(removeCmd?.type).toBe(1);
    });

    it('register subcommand should have required options', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const registerCmd = commandData.options?.find((opt: any) => opt.name === 'register');
        expect(registerCmd?.options).toBeDefined();
        expect(registerCmd?.options?.length).toBe(3);

        const optionNames = registerCmd?.options?.map((opt: any) => opt.name);
        expect(optionNames).toContain('server_name');
        expect(optionNames).toContain('server_url');
        expect(optionNames).toContain('api_key');
    });

    it('update subcommand should have optional url and api_key options', () => {
        const commandData = pterodactylCommand.data.toJSON();
        const updateCmd = commandData.options?.find((opt: any) => opt.name === 'update');
        expect(updateCmd?.options).toBeDefined();
        expect(updateCmd?.options?.length).toBe(3);

        const serverNameOption = updateCmd?.options?.find((opt: any) => opt.name === 'server_name');
        expect(serverNameOption?.required).toBe(true);

        const serverUrlOption = updateCmd?.options?.find((opt: any) => opt.name === 'server_url');
        expect(serverUrlOption?.required).toBe(false);

        const apiKeyOption = updateCmd?.options?.find((opt: any) => opt.name === 'api_key');
        expect(apiKeyOption?.required).toBe(false);
    });
});
