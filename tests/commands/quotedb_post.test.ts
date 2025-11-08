import { jest } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import type { Client, ChatInputCommandInteraction, Message, CacheType } from 'discord.js';

// Mock the config module before any imports
const mockApis = {
  quotedb: {
    url: "https://quotes.elmu.dev",
    apikey: "mock_api_key",
    user_id: "mock_user_id",
  },
};

jest.unstable_mockModule('../../src/config/index.js', () => ({
  apis: mockApis,
}));

// Mock functions
const mockSetTitle = jest.fn<any>().mockReturnThis();
const mockAddQuotes = jest.fn<any>().mockReturnThis();
const mockBuild = jest.fn<any>().mockReturnValue('Mocked Quote Embed');
const mockQuoteBuilder = jest.fn().mockImplementation(() => ({
  setTitle: mockSetTitle,
  addQuotes: mockAddQuotes,
  build: mockBuild,
}));

const mockCallerGet = jest.fn<() => Promise<any>>();
const mockCallerPost = jest.fn<() => Promise<any>>();
const mockBuildError = jest.fn<() => Promise<any>>();
const mockBuildUnknownError = jest.fn<() => Promise<any>>();

// Mock QuoteBuilder (exports default class)
jest.unstable_mockModule('../../src/helpers/quoteBuilder.js', () => ({
  default: mockQuoteBuilder,
}));

// Mock caller (exports default object with get/post methods)
jest.unstable_mockModule('../../src/helpers/caller.js', () => ({
  default: {
    get: mockCallerGet,
    post: mockCallerPost,
  },
}));

// Mock errorBuilder
jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
  buildError: mockBuildError,
  buildUnknownError: mockBuildUnknownError,
}));

// Import after mocking
const { default: quotedbPostCommand } = await import('../../src/commands/quotedb_post.js');
const { server } = await import('../mocks/server.js');

// Helper to create mock interaction
const createQuoteInteraction = (quote = 'Test Quote', author = 'Test Author') => {
  return {
    options: {
      getString: jest.fn((optionName: string) => {
        if (optionName === 'quote') return quote;
        if (optionName === 'author') return author;
        return null;
      }),
    },
    reply: jest.fn(),
  } as unknown as ChatInputCommandInteraction<CacheType>;
};

// Helper to create mock client
const createMockClient = () => {
  return {
    user: {
      displayAvatarURL: jest.fn().mockReturnValue('http://example.com/avatar.png'),
    },
  } as unknown as Client;
};

// Inline command structure tests
describe('command structure', () => {
  test('should have a data property', () => {
    expect(quotedbPostCommand.data).toBeDefined();
  });

  test('should have a name of "create_quote"', () => {
    expect(quotedbPostCommand.data.name).toBe('create_quote');
  });

  test('should have a description', () => {
    expect(quotedbPostCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(quotedbPostCommand.execute).toBeInstanceOf(Function);
  });
});

describe('quotedb_post command execution', () => {
  const mockClient = createMockClient();

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  test('should successfully create a quote via slash command', async () => {
    mockCallerPost.mockResolvedValueOnce({
      quote: {
        quote: 'Test Quote',
        author: 'Test Author',
        user_id: 'mock_user_id',
        date: 'mock_date',
      },
    });

    const mockInteraction = createQuoteInteraction();

    const result = await quotedbPostCommand.execute(mockInteraction, mockClient);

    expect(mockCallerPost).toHaveBeenCalledWith(
      'https://quotes.elmu.dev',
      '/api/v1/quotes',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' },
      expect.objectContaining({
        quote: 'Test Quote',
        author: 'Test Author',
        user_id: 'mock_user_id',
      })
    );
    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockSetTitle).toHaveBeenCalledWith('New Quote Created');
    expect(mockAddQuotes).toHaveBeenCalledWith([{
      quote: 'Test Quote',
      author: 'Test Author',
      user_id: 'mock_user_id',
      date: 'mock_date',
    }]);
    expect(mockBuild).toHaveBeenCalledWith(mockClient);
    expect(result).toBe('Mocked Quote Embed');
  });

  test('should handle error when creating a quote via slash command', async () => {
    const mockError = new Error('API Error');
    mockCallerPost.mockRejectedValueOnce(mockError);

    const mockInteraction = createQuoteInteraction();
    await quotedbPostCommand.execute(mockInteraction, mockClient);

    expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, mockError);
  });

  test('should successfully create a quote via reply', async () => {
    const mockRepliedMessage = {
      reference: true,
      content: 'Replied Quote Content',
      fetchReference: jest.fn<() => Promise<any>>().mockResolvedValueOnce({
        content: 'Replied Quote Content',
        member: {
          displayName: 'Replied Author',
        },
      }),
    } as unknown as Message;

    mockCallerPost.mockResolvedValueOnce({
      quote: {
        quote: 'Replied Quote Content',
        author: 'Replied Author',
        user_id: 'mock_user_id',
        date: 'mock_date',
      },
    });

    const result = await quotedbPostCommand.executeReply(mockRepliedMessage, mockClient);

    expect((mockRepliedMessage as any).fetchReference).toHaveBeenCalledTimes(1);
    expect(mockCallerPost).toHaveBeenCalledWith(
      'https://quotes.elmu.dev',
      '/api/v1/quotes',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' },
      expect.objectContaining({
        quote: 'Replied Quote Content',
        author: 'Replied Author',
        user_id: 'mock_user_id',
      })
    );
    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockSetTitle).toHaveBeenCalledWith('New Quote Created');
    expect(mockAddQuotes).toHaveBeenCalledWith([{
      quote: 'Replied Quote Content',
      author: 'Replied Author',
      user_id: 'mock_user_id',
      date: 'mock_date',
    }]);
    expect(mockBuild).toHaveBeenCalledWith(mockClient);
    expect(result).toBe('Mocked Quote Embed');
  });

  test('should return message if no reply reference', async () => {
    const mockMessage = {
      reference: false,
    } as unknown as Message;

    const result = await quotedbPostCommand.executeReply(mockMessage, mockClient);
    expect(result).toBe('You need to reply to a message to create a quote from it.');
  });

  test('should return message if replied message is empty or inaccessible', async () => {
    const mockMessage = {
      reference: true,
      fetchReference: jest.fn<() => Promise<any>>().mockResolvedValueOnce({ content: '' }),
    } as unknown as Message;

    const result = await quotedbPostCommand.executeReply(mockMessage, mockClient);
    expect(result).toBe('The message you replied to is empty or I can\'t access it.');
  });

  test('should handle error when creating a quote via reply', async () => {
    const mockRepliedMessage = {
      reference: true,
      content: 'Replied Quote Content',
      fetchReference: jest.fn<() => Promise<any>>().mockResolvedValueOnce({
        content: 'Replied Quote Content',
        member: {
          displayName: 'Replied Author',
        },
      }),
    } as unknown as Message;
    
    const mockError = new Error('API Error');
    mockCallerPost.mockRejectedValueOnce(mockError);

    await quotedbPostCommand.executeReply(mockRepliedMessage, mockClient);

    expect(mockBuildUnknownError).toHaveBeenCalledWith(mockError);
  });
});