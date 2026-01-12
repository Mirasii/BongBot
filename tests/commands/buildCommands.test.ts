import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Collection } from 'discord.js';
import type { ExtendedClient } from '../../src/helpers/interfaces.js';
const commandCount = 31;

// Mock all command modules
jest.unstable_mockModule('../../src/commands/arab.js', () => ({
    default: { data: { name: 'arab', toJSON: () => ({ name: 'arab' }) } }
}));
jest.unstable_mockModule('../../src/commands/callirap.js', () => ({
    default: { data: { name: 'callirap', toJSON: () => ({ name: 'callirap' }) } }
}));
jest.unstable_mockModule('../../src/commands/chat_ai.js', () => ({
    default: { data: { name: 'chat_ai', toJSON: () => ({ name: 'chat_ai' }) } }
}));
jest.unstable_mockModule('../../src/commands/cherry.js', () => ({
    default: { data: { name: 'cherry', toJSON: () => ({ name: 'cherry' }) } }
}));
jest.unstable_mockModule('../../src/commands/classic.js', () => ({
    default: { data: { name: 'classic', toJSON: () => ({ name: 'classic' }) } }
}));
jest.unstable_mockModule('../../src/commands/club_kid.js', () => ({
    default: { data: { name: 'club_kid', toJSON: () => ({ name: 'club_kid' }) } }
}));
jest.unstable_mockModule('../../src/commands/creeper.js', () => ({
    default: { data: { name: 'creeper', toJSON: () => ({ name: 'creeper' }) } }
}));
jest.unstable_mockModule('../../src/commands/cringe.js', () => ({
    default: { data: { name: 'cringe', toJSON: () => ({ name: 'cringe' }) } }
}));
jest.unstable_mockModule('../../src/commands/dance.js', () => ({
    default: { data: { name: 'dance', toJSON: () => ({ name: 'dance' }) } }
}));
jest.unstable_mockModule('../../src/commands/die.js', () => ({
    default: { data: { name: 'die', toJSON: () => ({ name: 'die' }) } }
}));
jest.unstable_mockModule('../../src/commands/fubuki.js', () => ({
    default: { data: { name: 'fubuki', toJSON: () => ({ name: 'fubuki' }) } }
}));
jest.unstable_mockModule('../../src/commands/funk.js', () => ({
    default: { data: { name: 'funk', toJSON: () => ({ name: 'funk' }) } }
}));
jest.unstable_mockModule('../../src/commands/help.js', () => ({
    default: { data: { name: 'help', toJSON: () => ({ name: 'help' }) } }
}));
jest.unstable_mockModule('../../src/commands/hentai.js', () => ({
    default: { data: { name: 'hentai', toJSON: () => ({ name: 'hentai' }) } }
}));
jest.unstable_mockModule('../../src/commands/hoe.js', () => ({
    default: { data: { name: 'hoe', toJSON: () => ({ name: 'hoe' }) } }
}));
jest.unstable_mockModule('../../src/commands/info.js', () => ({
    default: { data: { name: 'info', toJSON: () => ({ name: 'info' }) } }
}));
jest.unstable_mockModule('../../src/commands/mirasi.js', () => ({
    default: { data: { name: 'mirasi', toJSON: () => ({ name: 'mirasi' }) } }
}));
jest.unstable_mockModule('../../src/commands/no.js', () => ({
    default: { data: { name: 'no', toJSON: () => ({ name: 'no' }) } }
}));
jest.unstable_mockModule('../../src/commands/ping.js', () => ({
    default: { data: { name: 'ping', toJSON: () => ({ name: 'ping' }) } }
}));
jest.unstable_mockModule('../../src/commands/polka.js', () => ({
    default: { data: { name: 'polka', toJSON: () => ({ name: 'polka' }) } }
}));
jest.unstable_mockModule('../../src/commands/quotedb_get.js', () => ({
    default: { data: { name: 'quotedb_get', toJSON: () => ({ name: 'quotedb_get' }) } }
}));
jest.unstable_mockModule('../../src/commands/quotedb_get_random.js', () => ({
    default: { data: { name: 'quotedb_get_random', toJSON: () => ({ name: 'quotedb_get_random' }) } }
}));
jest.unstable_mockModule('../../src/commands/quotedb_post.js', () => ({
    default: { data: { name: 'quotedb_post', toJSON: () => ({ name: 'quotedb_post' }) } }
}));
jest.unstable_mockModule('../../src/commands/roll.js', () => ({
    default: { data: { name: 'roll', toJSON: () => ({ name: 'roll' }) } }
}));
jest.unstable_mockModule('../../src/commands/seachicken.js', () => ({
    default: { data: { name: 'seachicken', toJSON: () => ({ name: 'seachicken' }) } }
}));
jest.unstable_mockModule('../../src/commands/userinfo.js', () => ({
    default: { data: { name: 'userinfo', toJSON: () => ({ name: 'userinfo' }) } }
}));
jest.unstable_mockModule('../../src/commands/vape.js', () => ({
    default: { data: { name: 'vape', toJSON: () => ({ name: 'vape' }) } }
}));
jest.unstable_mockModule('../../src/commands/yes.js', () => ({
    default: { data: { name: 'yes', toJSON: () => ({ name: 'yes' }) } }
}));
jest.unstable_mockModule('../../src/commands/you.js', () => ({
    default: { data: { name: 'you', toJSON: () => ({ name: 'you' }) } }
}));

// Mock pterodactyl/master.js to avoid loading Database/better-sqlite3
jest.unstable_mockModule('../../src/commands/pterodactyl/master.js', () => ({
    default: [
        { data: { name: 'register_server', toJSON: () => ({ name: 'register_server' }) } },
        { data: { name: 'server_status', toJSON: () => ({ name: 'server_status' }) } }
    ]
}));

// Import after mocks are set up
const { default: buildCommands } = await import('../../src/commands/buildCommands.js');

describe('buildCommands', () => {
    let mockClient: ExtendedClient;

    beforeEach(() => {
        mockClient = {
            commands: new Collection(),
        } as unknown as ExtendedClient;
    });

    test('should create a commands collection on the client', () => {
        buildCommands(mockClient);
        
        expect(mockClient.commands).toBeInstanceOf(Collection);
    });

    test('should add all commands to the client commands collection', () => {
        buildCommands(mockClient);
        
        // Should have commandCount commands based on the commandsArray
        expect(mockClient.commands?.size).toBe(commandCount);
    });

    test('should set commands with correct names as keys', () => {
        buildCommands(mockClient);
        
        // Test a few command names
        expect(mockClient.commands?.has('ping')).toBe(true);
        expect(mockClient.commands?.has('help')).toBe(true);
        expect(mockClient.commands?.has('arab')).toBe(true);
        expect(mockClient.commands?.has('chat_ai')).toBe(true);
    });

    test('should return an array of command data in JSON format', () => {
        const result = buildCommands(mockClient);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(commandCount);
    });

    test('should return commands with name property', () => {
        const result = buildCommands(mockClient);
        
        // Check that each command has a name
        result.forEach(cmd => {
            expect(cmd).toHaveProperty('name');
            expect(typeof cmd.name).toBe('string');
        });
    });

    test('should store command objects in the collection', () => {
        buildCommands(mockClient);
        
        const pingCommand = mockClient.commands?.get('ping');
        expect(pingCommand).toBeDefined();
        expect(pingCommand).toHaveProperty('data');
        expect(pingCommand.data).toHaveProperty('name');
        expect(pingCommand.data.name).toBe('ping');
    });

    test(`should handle all ${commandCount} commands without errors`, () => {
        expect(() => buildCommands(mockClient)).not.toThrow();
        
        const result = buildCommands(mockClient);
        expect(result.length).toBe(commandCount);
    });
});