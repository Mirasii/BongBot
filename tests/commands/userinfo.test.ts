import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, User, GuildMember, Guild, CacheType } from 'discord.js';

// Import the command directly without mocking discord.js
const { default: userinfoCommand } = await import('../../src/commands/userinfo.js');

// Inline command structure tests
describe('command structure', () => {
  test('should have a data property', () => {
    expect(userinfoCommand.data).toBeDefined();
  });

  test('should have a name of "usercard"', () => {
    expect(userinfoCommand.data.name).toBe('usercard');
  });

  test('should have a description', () => {
    expect(userinfoCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(userinfoCommand.execute).toBeInstanceOf(Function);
  });
});

describe('userinfo command execution', () => {
  const mockDate = new Date('2023-01-01T00:00:00.000Z');

  // Common mock user factory
  const createMockUser = (username: string, tag: string, id: string, isBot = false) => ({
    username,
    tag,
    id,
    bot: isBot,
    createdTimestamp: mockDate.getTime(),
    displayAvatarURL: jest.fn(() => `http://example.com/${username}_avatar.jpg`),
  } as unknown as User);

  // Common mock member factory
  const createMockMember = (roles: string[] = ['@everyone']) => ({
    joinedTimestamp: mockDate.getTime(),
    roles: {
      cache: {
        map: jest.fn((fn: any) => roles.map(fn)),
      },
    },
  } as unknown as GuildMember);

  const mockUser = createMockUser('testuser', 'testuser#1234', '1234567890');
  const mockTargetUser = createMockUser('targetuser', 'targetuser#5678', '0987654321');
  const mockMember = createMockMember(['@everyone', '@member']);
  const mockTargetMember = createMockMember(['@everyone', '@vip']);

  const createUserInfoMockInteraction = (targetUser: User | null = null) => {
    return {
      inGuild: jest.fn(() => true),
      guild: {
        members: {
          fetch: jest.fn<(id: string) => Promise<GuildMember>>(async (id: string) => {
            if (id === mockUser.id) return mockMember;
            if (id === mockTargetUser.id) return mockTargetMember;
            throw new Error('Member not found');
          }),
        },
      } as unknown as Guild,
      user: mockUser,
      options: {
        getUser: jest.fn(() => targetUser),
      },
    } as unknown as ChatInputCommandInteraction<CacheType>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should return info card for the interaction user if no target is provided', async () => {
    const mockInteraction = createUserInfoMockInteraction();

    const result = await userinfoCommand.execute(mockInteraction);

    expect((mockInteraction.options as any).getUser).toHaveBeenCalledWith('target');
    expect((mockInteraction.guild as any).members.fetch).toHaveBeenCalledWith(mockUser.id);
    expect(result).toHaveProperty('embeds');
    expect((result as any).embeds).toHaveLength(1);
    
    // Check embed properties by converting to JSON
    const embed = (result as any).embeds[0];
    expect(embed.data.title).toBe(`Info card for ${mockUser.username}`);
    expect(embed.data.color).toBe(0x0099ff);
    expect(embed.data.fields).toHaveLength(6);
    expect(embed.data.fields[0]).toEqual({ name: 'User Tag', value: mockUser.tag, inline: true });
    expect(embed.data.fields[1]).toEqual({ name: 'User ID', value: mockUser.id, inline: true });
    expect(embed.data.fields[2]).toEqual({ name: 'Bot?', value: 'No', inline: true });
  });

  test('should return info card for the target user if provided', async () => {
    const mockInteraction = createUserInfoMockInteraction(mockTargetUser);

    const result = await userinfoCommand.execute(mockInteraction);

    expect((mockInteraction.options as any).getUser).toHaveBeenCalledWith('target');
    expect((mockInteraction.guild as any).members.fetch).toHaveBeenCalledWith(mockTargetUser.id);
    expect(result).toHaveProperty('embeds');
    expect((result as any).embeds).toHaveLength(1);
    
    // Check embed properties
    const embed = (result as any).embeds[0];
    expect(embed.data.title).toBe(`Info card for ${mockTargetUser.username}`);
    expect(embed.data.color).toBe(0x0099ff);
    expect(embed.data.fields).toHaveLength(6);
    expect(embed.data.fields[0]).toEqual({ name: 'User Tag', value: mockTargetUser.tag, inline: true });
    expect(embed.data.fields[1]).toEqual({ name: 'User ID', value: mockTargetUser.id, inline: true });
    expect(embed.data.fields[2]).toEqual({ name: 'Bot?', value: 'No', inline: true });
  });

  test('should return error message when not in a guild', async () => {
    const mockInteraction = createUserInfoMockInteraction();
    (mockInteraction as any).inGuild = jest.fn(() => false);

    const result = await userinfoCommand.execute(mockInteraction);

    expect(result).toBe('This command can only be used in a server.');
  });

  test('should show "Yes" when user is a bot', async () => {
    const botUser = createMockUser('botuser', 'botuser#0000', '9999999999', true);
    const botMember = createMockMember(['@everyone', '@bot']);

    const mockInteraction = {
      inGuild: jest.fn(() => true),
      guild: {
        members: {
          fetch: jest.fn<(id: string) => Promise<GuildMember>>(async (id: string) => {
            if (id === botUser.id) return botMember;
            throw new Error('Member not found');
          }),
        },
      } as unknown as Guild,
      user: mockUser,
      options: {
        getUser: jest.fn(() => botUser),
      },
    } as unknown as ChatInputCommandInteraction<CacheType>;

    const result = await userinfoCommand.execute(mockInteraction);

    const embed = (result as any).embeds[0];
    expect(embed.data.fields[2]).toEqual({ name: 'Bot?', value: 'Yes', inline: true });
  });

  test('should show "None" when member has no roles', async () => {
    const noRolesMember = createMockMember([]);

    const mockInteraction = {
      inGuild: jest.fn(() => true),
      guild: {
        members: {
          fetch: jest.fn<(id: string) => Promise<GuildMember>>(async () => noRolesMember),
        },
      } as unknown as Guild,
      user: mockUser,
      options: {
        getUser: jest.fn(() => null),
      },
    } as unknown as ChatInputCommandInteraction<CacheType>;

    const result = await userinfoCommand.execute(mockInteraction);

    const embed = (result as any).embeds[0];
    expect(embed.data.fields[5]).toEqual({ name: 'Roles', value: 'None', inline: false });
  });

  test('should handle errors and return error response', async () => {
    const mockInteraction = {
      inGuild: jest.fn(() => true),
      guild: {
        members: {
          fetch: jest.fn<(id: string) => Promise<GuildMember>>(async () => {
            throw new Error('Failed to fetch member');
          }),
        },
      } as unknown as Guild,
      user: mockUser,
      options: {
        getUser: jest.fn(() => null),
      },
      commandName: 'usercard',
    } as unknown as ChatInputCommandInteraction<CacheType>;

    const result = await userinfoCommand.execute(mockInteraction);

    // The error handler should be called and return an error response
    expect(result).toHaveProperty('isError', true);
  });
});