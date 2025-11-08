import { jest } from '@jest/globals';
import type { 
  Client, 
  ChatInputCommandInteraction,
  Guild, 
  GuildMember, 
  User,
  Message,
  GuildMemberManager,
  CacheType
} from 'discord.js';
import { setupStandardTestEnvironment, server } from '../utils/testSetup.js';
import { testCommandStructure, createMockInteraction, createMockClient } from '../utils/commandTestUtils.js';
import { http, HttpResponse } from 'msw';

// Mock the config module before any imports
const mockApis = {
  openai: {
    active: true,
    url: "https://api.openai.com",
    apikey: "mock_openai_key",
    model: "gpt-4o",
  },
  googleai: {
    active: false,
    url: "https://generativelanguage.googleapis.com",
    apikey: "mock_googleai_key",
    model: "gemini-2.5-flash-lite",
    image_model: "gemini-2.5-flash-image-preview",
  },
};

jest.unstable_mockModule('../../src/config/index.js', () => ({
  apis: mockApis,
}));

// Mock embedBuilder
const mockConstructEmbedWithRandomFile = jest.fn();
const mockConstructEmbedWithAttachment = jest.fn();
const mockAddFooter = jest.fn();
const mockBuild = jest.fn();

jest.unstable_mockModule('../../src/helpers/embedBuilder.js', () => ({
  default: class EMBED_BUILDER {
    constructEmbedWithRandomFile = mockConstructEmbedWithRandomFile;
    constructEmbedWithAttachment = mockConstructEmbedWithAttachment;
  }
}));

// Import after mocking
const { default: chatAiCommand } = await import('../../src/commands/chat_ai.js');
const { apis } = await import('../../src/config/index.js');

// Setup MSW server and standard mock cleanup
setupStandardTestEnvironment();

// Test standard command structure
testCommandStructure(chatAiCommand, 'chat');

describe('chat_ai command execution', () => {
  const mockClient = createMockClient() as unknown as Client;

  let mockInteraction: ChatInputCommandInteraction<CacheType>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    apis.openai.active = true;
    apis.googleai.active = false;
    
    mockConstructEmbedWithRandomFile.mockReturnValue('mocked embed');
    mockAddFooter.mockReturnThis();
    mockBuild.mockReturnValue('mocked embed with attachment');
    mockConstructEmbedWithAttachment.mockReturnValue({
      addFooter: mockAddFooter,
      build: mockBuild,
    });

    const mockGuildMemberManager = {
      fetch: jest.fn<() => Promise<GuildMember>>().mockResolvedValue({ nickname: 'test_user' } as GuildMember),
    } as unknown as GuildMemberManager;

    const mockGuild = {
      members: mockGuildMemberManager,
      id: 'test_server',
    } as Partial<Guild>;

    const mockUser = {
      id: 'test_user_id',
    } as Partial<User>;

    mockInteraction = {
      ...createMockInteraction({}),
      options: {
        getString: jest.fn().mockReturnValue('test input'),
      },
      guildId: 'test_server',
      guild: mockGuild,
      user: mockUser,
    } as unknown as ChatInputCommandInteraction<CacheType>;
  });

  it('should call OpenAI API when it is active', async () => {
    const result = await chatAiCommand.execute(mockInteraction, mockClient);

    expect(result).toBe('mocked embed');
  });

  it('should call Google AI API when it is active', async () => {
    apis.openai.active = false;
    apis.googleai.apikey = 'mock_googleai_key';
    apis.googleai.active = true;

    const result = await chatAiCommand.execute(mockInteraction, mockClient);

    expect(result).toBe('mocked embed with attachment');
  });

  it('should return a message when no AI is active', async () => {
    apis.openai.active = false;
    apis.googleai.active = false;

    const result = await chatAiCommand.execute(mockInteraction, mockClient);

    expect(mockConstructEmbedWithRandomFile).toHaveBeenCalledWith(
      'Hmph! Why are you trying to talk to me when no AI service is active?'
    );
    expect(result).toBe('mocked embed');
  });

  it('should handle legacy commands', async () => {
    const mockGuildMemberManager = {
      fetch: jest.fn<() => Promise<GuildMember>>().mockResolvedValue({ nickname: 'test_user' } as GuildMember),
    } as unknown as GuildMemberManager;

    const mockMsg = {
      content: '<@123456789> test input',
      guild: {
        members: mockGuildMemberManager,
        id: 'test_server',
      } as Partial<Guild>,
      author: {
        id: 'test_user_id',
      } as Partial<User>,
    } as Partial<Message>;

    const result = await chatAiCommand.executeLegacy(mockMsg as Message, mockClient);
    expect(result).toBe('mocked embed');
  });

  it('should throw an error when OpenAI API call fails', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    await expect(chatAiCommand.execute(mockInteraction, mockClient)).rejects.toThrow();
  });

  it('should handle Google AI image generation failure and fallback to random file', async () => {
    apis.googleai.active = true;
    apis.googleai.apikey = 'mock_googleai_key';
    apis.openai.active = false;

    // Mock image generation failure
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
        () => {
          return HttpResponse.json({
            candidates: [{ content: { parts: [{ text: 'no image data' }] } }],
          });
        }
      )
    );

    const result = await chatAiCommand.execute(mockInteraction, mockClient);

    expect(mockConstructEmbedWithRandomFile).toHaveBeenCalled();
    expect(result).toBe('mocked embed');
  });

  it('should handle multiple messages and maintain history', async () => {
    apis.openai.active = true;
    apis.googleai.active = false;

    // First message
    await chatAiCommand.execute(mockInteraction, mockClient);

    // Second message to test history functionality
    const mockGuildMemberManager = {
      fetch: jest.fn<() => Promise<GuildMember>>().mockResolvedValue({ nickname: 'test_user' } as GuildMember),
    } as unknown as GuildMemberManager;

    const secondInteraction = {
      options: {
        getString: jest.fn().mockReturnValue('follow up message'),
        data: [],
      },
      user: {
        id: 'test_user_id',
      } as Partial<User>,
      guildId: 'test_server',
      guild: {
        id: 'test_server',
        members: mockGuildMemberManager,
      } as Partial<Guild>,
    } as unknown as ChatInputCommandInteraction;

    const result = await chatAiCommand.execute(
      secondInteraction,
      mockClient
    );
    expect(result).toBe('mocked embed');
  });

  it('should handle history limit and splice old messages', async () => {
    apis.openai.active = true;
    apis.googleai.active = false;

    const mockGuildMemberManager = {
      fetch: jest.fn<() => Promise<GuildMember>>().mockResolvedValue({ nickname: 'test_user' } as GuildMember),
    } as unknown as GuildMemberManager;

    // Fill up the history to exceed MAX_HISTORY_LENGTH (100)
    for (let i = 0; i < 51; i++) {
      const testInteraction = {
        options: {
          getString: jest.fn().mockReturnValue(`message ${i}`),
          data: [],
        },
        user: {
          id: 'test_user_id',
        } as Partial<User>,
        guildId: 'history_test_server',
        guild: {
          members: mockGuildMemberManager,
        } as Partial<Guild>,
      } as unknown as ChatInputCommandInteraction;

      await chatAiCommand.execute(testInteraction, mockClient);
    }

    expect(mockConstructEmbedWithRandomFile).toHaveBeenCalled();
  });

  it('should throw error when Google AI returns no text response', async () => {
    apis.googleai.active = true;
    apis.googleai.apikey = 'mock_googleai_key';
    apis.openai.active = false;

    // Mock Google AI to return no text
    server.use(
      http.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        () => {
          return HttpResponse.json({
            candidates: [{ content: { parts: [{ text: '' }] } }],
          });
        }
      )
    );

    await expect(chatAiCommand.execute(mockInteraction, mockClient)).rejects.toThrow(
      'No response from AI - potentially malicious prompt?'
    );
  });
});