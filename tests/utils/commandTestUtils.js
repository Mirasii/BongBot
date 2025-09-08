/**
 * @fileoverview Shared utilities for command testing to eliminate code duplication
 */
const { SlashCommandBuilder } = require('discord.js');

/**
 * Common mocks used across command tests
 */
const mockFs = () => {
    return jest.mock('fs', () => ({
        readFileSync: jest.fn()
    }));
};

const mockErrorBuilder = () => {
    return jest.mock('../../src/helpers/errorBuilder', () => ({
        buildError: jest.fn().mockResolvedValue({
            embeds: [],
            files: [],
            flags: 64,
            isError: true
        })
    }));
};

/**
 * Standard command structure tests that all commands should pass
 * @param {Object} command - The command module to test
 * @param {string} expectedName - Expected command name
 * @param {string} expectedAttachment - Expected attachment filename (for media commands)
 */
const testCommandStructure = (command, expectedName, expectedAttachment = null) => {
    describe(`${expectedName} command structure`, () => {
        it('should have a data property', () => {
            expect(command.data).toBeInstanceOf(SlashCommandBuilder);
        });

        it(`should have a name of "${expectedName}"`, () => {
            expect(command.data.name).toBe(expectedName);
        });

        it('should have a description', () => {
            expect(command.data.description).toBeTruthy();
        });

        it('should have an execute method', () => {
            expect(command.execute).toBeInstanceOf(Function);
        });
    });
};

/**
 * Standard media command tests for commands that return file attachments
 * @param {Object} command - The command module to test
 * @param {string} expectedAttachment - Expected attachment filename
 */
const testMediaCommand = (command, expectedAttachment) => {
    describe(`${command.data.name} command execution`, () => {
        it(`should return an object with ${expectedAttachment} as attachment`, async () => {
            const result = await command.execute();
            expect(result).toHaveProperty('files');
            expect(result.files[0]).toHaveProperty('attachment');
            expect(result.files[0]).toHaveProperty('name');
            expect(result.files[0].name).toBe(expectedAttachment);
        });

        it('should handle errors gracefully', async () => {
            // Force an error condition
            const fs = require('fs');
            fs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const result = await command.execute();
            expect(result.isError).toBe(true);
        });
    });
};

/**
 * Setup function for media command tests
 * @param {string} commandName - Name of the command
 * @param {string} filename - Expected filename
 * @param {string} moduleName - Optional module name if different from command name
 */
const setupMediaCommandTest = (commandName, filename, moduleName = commandName) => {
    // Setup mocks
    mockFs();
    mockErrorBuilder();

    const command = require(`../../src/commands/${moduleName}`);
    
    describe(`${commandName} command`, () => {
        testCommandStructure(command, commandName, filename);
        testMediaCommand(command, filename);
    });
};

/**
 * Create a standardized mock interaction for testing
 * @param {Object} options - Configuration for the mock interaction
 * @returns {Object} Mock interaction object
 */
const createMockInteraction = (options = {}) => {
    const defaults = {
        options: {
            getString: jest.fn(),
            getInteger: jest.fn(),
            getUser: jest.fn(),
        },
        guild: {
            id: 'test_guild_id',
            members: {
                cache: new Map(),
                fetch: jest.fn(),
            },
        },
        user: {
            id: 'test_user_id',
            username: 'testuser',
        },
        reply: jest.fn(),
        commandName: options.commandName || 'test',
    };

    return { ...defaults, ...options };
};

/**
 * Create a standardized mock client for testing
 * @param {Object} options - Configuration for the mock client
 * @returns {Object} Mock client object
 */
const createMockClient = (options = {}) => {
    const defaults = {
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
        commands: new Map(),
    };

    return { ...defaults, ...options };
};

module.exports = {
    mockFs,
    mockErrorBuilder,
    testCommandStructure,
    testMediaCommand,
    setupMediaCommandTest,
    createMockInteraction,
    createMockClient
};
