import { jest } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import type { Client, ChatInputCommandInteraction, CacheType } from 'discord.js';

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
const mockGetQuote = jest.fn<any>();
const mockQuoteBuilder = jest.fn().mockImplementation(() => ({
  getQuote: mockGetQuote,
}));

const mockCallerGet = jest.fn<() => Promise<any>>();
const mockCallerPost = jest.fn<() => Promise<any>>();
const mockBuildError = jest.fn<() => Promise<string>>().mockResolvedValue('Mocked Error Embed');

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
}));

// Import after mocking
const { default: quotedbGetCommand } = await import('../../src/commands/quotedb_get.js');
const { server } = await import('../mocks/server.js');

// Inline command structure tests
describe('command structure', () => {
  test('should have a data property', () => {
    expect(quotedbGetCommand.data).toBeDefined();
  });

  test('should have a name of "get_quotes"', () => {
    expect(quotedbGetCommand.data.name).toBe('get_quotes');
  });

  test('should have a description', () => {
    expect(quotedbGetCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(quotedbGetCommand.execute).toBeInstanceOf(Function);
  });
});

describe('quotedb_get command execution', () => {
  const mockInteraction = {
    options: {
      getInteger: jest.fn(),
      getBoolean: jest.fn(),
    },
    guild: {
      id: 'mock_server_id',
    },
    reply: jest.fn(),
  } as unknown as ChatInputCommandInteraction<CacheType>;

  const mockClient = {} as unknown as Client;

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildError.mockResolvedValue('Mocked Error Embed');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  test('should return a single recent quote by default', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(null);
    (mockInteraction.options.getBoolean as jest.Mock).mockReturnValueOnce(null);
    mockGetQuote.mockResolvedValueOnce('Mocked Quote Embed');

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockGetQuote).toHaveBeenCalledWith(
      '/api/v1/quotes/search',
      'Recent Quotes',
      mockClient,
      mockInteraction
    );
    expect(result).toBe('Mocked Quote Embed');
  });

  test('should return the specified number of recent quotes', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(3);
    (mockInteraction.options.getBoolean as jest.Mock).mockReturnValueOnce(null);
    mockGetQuote.mockResolvedValueOnce('Mocked Quote Embed');

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockGetQuote).toHaveBeenCalledWith(
      '/api/v1/quotes/search',
      'Recent Quotes',
      mockClient,
      mockInteraction
    );
    expect(result).toBe('Mocked Quote Embed');
  });

  test('should return an error if more than 5 quotes are requested', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(6);
    (mockInteraction.options.getBoolean as jest.Mock).mockReturnValueOnce(null);
    mockGetQuote.mockResolvedValueOnce('Mocked Error Embed');

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockGetQuote).toHaveBeenCalledWith(
      '/api/v1/quotes/search',
      'Recent Quotes',
      mockClient,
      mockInteraction
    );
    expect(result).toBe('Mocked Error Embed');
  });

  test('should return an empty quote embed if no quotes are found', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(1);
    (mockInteraction.options.getBoolean as jest.Mock).mockReturnValueOnce(null);
    mockGetQuote.mockResolvedValueOnce('Mocked Error Embed');

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockGetQuote).toHaveBeenCalledWith(
      '/api/v1/quotes/search',
      'Recent Quotes',
      mockClient,
      mockInteraction
    );
    expect(result).toBe('Mocked Error Embed');
  });

  test('should handle API errors', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(1);
    (mockInteraction.options.getBoolean as jest.Mock).mockReturnValueOnce(null);
    const mockError = new Error('API Error');
    mockGetQuote.mockRejectedValueOnce(mockError);

    await expect(quotedbGetCommand.execute(mockInteraction, mockClient)).rejects.toThrow('API Error');
  });
});