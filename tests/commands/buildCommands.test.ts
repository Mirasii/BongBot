import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Collection } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';

// Core imports SQLite, whose module initialization needs the real filesystem API.
jest.unmock('fs');
const { Caller } = await import('@pookiesoft/bongbot-core');
const commandCount = 29;
// Mock all command modules
jest.unstable_mockModule('../../src/commands/arab.js', () => ({
    default: { data: { name: 'arab', toJSON: () => ({ name: 'arab' }) } },
}));
jest.unstable_mockModule('../../src/commands/callirap.js', () => ({
    default: { data: { name: 'callirap', toJSON: () => ({ name: 'callirap' }) } },
}));
jest.unstable_mockModule('../../src/commands/chat_ai.js', () => ({
    default: { data: { name: 'chat_ai', toJSON: () => ({ name: 'chat_ai' }) } },
}));
jest.unstable_mockModule('../../src/commands/cherry.js', () => ({
    default: { data: { name: 'cherry', toJSON: () => ({ name: 'cherry' }) } },
}));
jest.unstable_mockModule('../../src/commands/classic.js', () => ({
    default: { data: { name: 'classic', toJSON: () => ({ name: 'classic' }) } },
}));
jest.unstable_mockModule('../../src/commands/club_kid.js', () => ({
    default: { data: { name: 'club_kid', toJSON: () => ({ name: 'club_kid' }) } },
}));
jest.unstable_mockModule('../../src/commands/creeper.js', () => ({
    default: { data: { name: 'creeper', toJSON: () => ({ name: 'creeper' }) } },
}));
jest.unstable_mockModule('../../src/commands/cringe.js', () => ({
    default: { data: { name: 'cringe', toJSON: () => ({ name: 'cringe' }) } },
}));
jest.unstable_mockModule('../../src/commands/dance.js', () => ({
    default: { data: { name: 'dance', toJSON: () => ({ name: 'dance' }) } },
}));
jest.unstable_mockModule('../../src/commands/die.js', () => ({
    default: { data: { name: 'die', toJSON: () => ({ name: 'die' }) } },
}));
jest.unstable_mockModule('../../src/commands/funk.js', () => ({
    default: { data: { name: 'funk', toJSON: () => ({ name: 'funk' }) } },
}));
jest.unstable_mockModule('../../src/commands/help.js', () => ({
    default: { data: { name: 'help', toJSON: () => ({ name: 'help' }) } },
}));
jest.unstable_mockModule('../../src/commands/hentai.js', () => ({
    default: { data: { name: 'hentai', toJSON: () => ({ name: 'hentai' }) } },
}));
jest.unstable_mockModule('../../src/commands/hoe.js', () => ({
    default: { data: { name: 'hoe', toJSON: () => ({ name: 'hoe' }) } },
}));
jest.unstable_mockModule('../../src/commands/info.js', () => ({
    default: { data: { name: 'info', toJSON: () => ({ name: 'info' }) } },
}));
jest.unstable_mockModule('../../src/commands/mirasi.js', () => ({
    default: { data: { name: 'mirasi', toJSON: () => ({ name: 'mirasi' }) } },
}));
jest.unstable_mockModule('../../src/commands/no.js', () => ({
    default: { data: { name: 'no', toJSON: () => ({ name: 'no' }) } },
}));
jest.unstable_mockModule('../../src/commands/ping.js', () => ({
    default: { data: { name: 'ping', toJSON: () => ({ name: 'ping' }) } },
}));
jest.unstable_mockModule('../../src/commands/roll.js', () => ({
    default: { data: { name: 'roll', toJSON: () => ({ name: 'roll' }) } },
}));
jest.unstable_mockModule('../../src/commands/seachicken.js', () => ({
    default: { data: { name: 'seachicken', toJSON: () => ({ name: 'seachicken' }) } },
}));
jest.unstable_mockModule('../../src/commands/userinfo.js', () => ({
    default: { data: { name: 'userinfo', toJSON: () => ({ name: 'userinfo' }) } },
}));
jest.unstable_mockModule('../../src/commands/vape.js', () => ({
    default: { data: { name: 'vape', toJSON: () => ({ name: 'vape' }) } },
}));
jest.unstable_mockModule('../../src/commands/yes.js', () => ({
    default: { data: { name: 'yes', toJSON: () => ({ name: 'yes' }) } },
}));
jest.unstable_mockModule('../../src/commands/you.js', () => ({
    default: { data: { name: 'you', toJSON: () => ({ name: 'you' }) } },
}));

// Mock bongbot-ptero to avoid loading native dependencies
jest.unstable_mockModule('@pookiesoft/bongbot-ptero', () => ({
    pterodactyl: { data: { name: 'pterodactyl', toJSON: () => ({ name: 'pterodactyl' }) } },
}));

// Mock bongbot-quote package
jest.unstable_mockModule('@pookiesoft/bongbot-quote', () => ({
    quotedb: { data: { name: 'quote', toJSON: () => ({ name: 'quote' }) } },
}));

// Import after mocks are set up
const { default: buildCommands } = await import('../../src/commands/buildCommands.js');

describe('buildCommands', () => {
    let mockClient: ExtendedClient;

    beforeEach(() => {
        process.env.IMAGE_PROVIDER = 'safebooru';
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
        expect(mockClient.commands?.has('fox')).toBe(true);
        expect(mockClient.commands?.has('clown')).toBe(true);
        expect(mockClient.commands?.has('booru')).toBe(true);
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
        result.forEach((cmd) => {
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

test('registers the real Booru search schema with autocomplete', () => {
    const client = { commands: new Collection() } as unknown as ExtendedClient;
    const commands = buildCommands(client);
    const search = commands.find((command) => command.name === 'booru').options[0];
    expect(search.name).toBe('search');
    expect(search.options).toHaveLength(5);
    expect(search.options.every((option: any) => option.autocomplete)).toBe(true);
    expect(search.options[0].required).toBe(true);
    expect(new Set(commands.map((command) => command.name)).size).toBe(commandCount);
});

test.each([
    ['fox', 'shirakami_fubuki'],
    ['clown', 'omaru_polka'],
])('%s searches through the configured Booru provider', async (name, tag) => {
    process.env.IMAGE_PROVIDER = 'safebooru';
    process.env.ALLOW_AI_IMAGES = 'false';
    const get = jest.spyOn(Caller.prototype, 'get').mockResolvedValue([]);
    try {
        const client = { commands: new Collection() } as unknown as ExtendedClient;
        buildCommands(client);
        const response = await client.commands.get(name)!.execute({} as any, client);
        expect(response).toMatchObject({ content: 'No images found for those tags.' });
        expect(get).toHaveBeenCalledWith('https://safebooru.org', '/index.php', expect.any(String));
        const query = new URLSearchParams(get.mock.calls[0][2] as string);
        expect(query.get('tags')).toBe(`${tag} -ai-generated`);
    } finally {
        get.mockRestore();
    }
});

test('rejects invalid provider configuration before registering commands', () => {
    process.env.IMAGE_PROVIDER = 'invalid';
    const client = { commands: new Collection() } as unknown as ExtendedClient;
    try {
        expect(() => buildCommands(client)).toThrow('IMAGE_PROVIDER must be safebooru or gelbooru.');
        expect(client.commands.size).toBe(0);
    } finally {
        delete process.env.IMAGE_PROVIDER;
    }
});

test('downloads an image through Core binary HTTP and returns a Discord attachment', async () => {
    process.env.IMAGE_PROVIDER = 'safebooru';
    const bytes = Buffer.from('image bytes');
    const url = 'https://safebooru.org/images/example.png';
    const get = jest
        .spyOn(Caller.prototype, 'get')
        .mockResolvedValueOnce([{ id: 1, rating: 'general', file_url: url }])
        .mockResolvedValueOnce({ data: bytes, contentType: 'image/png' });
    try {
        const client = { commands: new Collection() } as unknown as ExtendedClient;
        buildCommands(client);
        const response = (await client.commands.get('fox')!.execute({} as any, client)) as any;
        expect(get).toHaveBeenLastCalledWith(
            url,
            null,
            null,
            expect.objectContaining({ Referer: 'https://safebooru.org/' }),
            'binary'
        );
        expect(response.files[0].attachment).toEqual(bytes);
        expect(response.files[0].name).toBe('safebooru-image.png');
    } finally {
        get.mockRestore();
    }
});
