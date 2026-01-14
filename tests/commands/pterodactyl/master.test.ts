import { jest } from '@jest/globals';

// Mock Database to prevent better-sqlite3 from being loaded
jest.unstable_mockModule('../../../src/helpers/database.js', () => ({
    default: jest.fn(),
}));

// Mock errorBuilder
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
}));

// Mock the subcommand modules
const mockRegisterExecute = jest.fn();
const mockListExecute = jest.fn();
const mockServerStatusExecute = jest.fn();
const mockUpdateExecute = jest.fn();
const mockRemoveExecute = jest.fn();
const mockSetupCollector = jest.fn();

jest.unstable_mockModule('../../../src/commands/pterodactyl/register_server.js', () => ({
    execute: mockRegisterExecute,
}));

jest.unstable_mockModule('../../../src/commands/pterodactyl/list_servers.js', () => ({
    execute: mockListExecute,
}));

jest.unstable_mockModule('../../../src/commands/pterodactyl/server_status.js', () => ({
    execute: mockServerStatusExecute,
    setupCollector: mockSetupCollector,
}));

jest.unstable_mockModule('../../../src/commands/pterodactyl/update_server.js', () => ({
    execute: mockUpdateExecute,
}));

jest.unstable_mockModule('../../../src/commands/pterodactyl/remove_server.js', () => ({
    execute: mockRemoveExecute,
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
        expect(typeof pterodactylCommand.setupCollector).toBe('function');
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

    describe('execute method', () => {
        let mockInteraction: any;
        let mockClient: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockClient = {};
            mockInteraction = {
                options: {
                    getSubcommand: jest.fn(),
                },
            };
        });

        it('should call register_server execute for register subcommand', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('register');
            mockRegisterExecute.mockResolvedValue({ content: 'registered' });

            const result = await pterodactylCommand.execute(mockInteraction, mockClient);

            expect(mockRegisterExecute).toHaveBeenCalledWith(mockInteraction, mockClient);
            expect(result).toEqual({ content: 'registered' });
        });

        it('should call list_servers execute for list subcommand', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('list');
            mockListExecute.mockResolvedValue({ content: 'listed' });

            const result = await pterodactylCommand.execute(mockInteraction, mockClient);

            expect(mockListExecute).toHaveBeenCalledWith(mockInteraction, mockClient);
            expect(result).toEqual({ content: 'listed' });
        });

        it('should call server_status execute for manage subcommand', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('manage');
            mockServerStatusExecute.mockResolvedValue({ content: 'managed' });

            const result = await pterodactylCommand.execute(mockInteraction, mockClient);

            expect(mockServerStatusExecute).toHaveBeenCalledWith(mockInteraction, mockClient);
            expect(result).toEqual({ content: 'managed' });
        });

        it('should call update_server execute for update subcommand', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('update');
            mockUpdateExecute.mockResolvedValue({ content: 'updated' });

            const result = await pterodactylCommand.execute(mockInteraction, mockClient);

            expect(mockUpdateExecute).toHaveBeenCalledWith(mockInteraction, mockClient);
            expect(result).toEqual({ content: 'updated' });
        });

        it('should call remove_server execute for remove subcommand', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('remove');
            mockRemoveExecute.mockResolvedValue({ content: 'removed' });

            const result = await pterodactylCommand.execute(mockInteraction, mockClient);

            expect(mockRemoveExecute).toHaveBeenCalledWith(mockInteraction, mockClient);
            expect(result).toEqual({ content: 'removed' });
        });

        it('should return unknown subcommand message for invalid subcommand', async () => {
            mockInteraction.options.getSubcommand.mockReturnValue('invalid');

            const result = await pterodactylCommand.execute(mockInteraction, mockClient);

            expect(result).toEqual({
                content: 'Unknown subcommand',
                ephemeral: true,
            });
        });
    });
});
