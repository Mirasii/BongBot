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
    mockCallerGet.mockResolvedValueOnce({
      quotes: [{
        quote: 'Recent Quote 1',
        author: 'Author 1',
      }],
    });

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockCallerGet).toHaveBeenCalledWith(
      'https://quotes.elmu.dev',
      '/api/v1/quotes/search/user/mock_user_id',
      'max_quotes=1',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
    );
    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockSetTitle).toHaveBeenCalledWith('Recent Quotes');
    expect(mockAddQuotes).toHaveBeenCalledWith([{
      quote: 'Recent Quote 1',
      author: 'Author 1',
    }]);
    expect(mockBuild).toHaveBeenCalledWith(mockClient);
    expect(result).toBe('Mocked Quote Embed');
  });

  test('should return the specified number of recent quotes', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(3);
    mockCallerGet.mockResolvedValueOnce({
      quotes: [
        { quote: 'Recent Quote 1', author: 'Author 1' },
        { quote: 'Recent Quote 2', author: 'Author 2' },
        { quote: 'Recent Quote 3', author: 'Author 3' },
      ],
    });

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockCallerGet).toHaveBeenCalledWith(
      'https://quotes.elmu.dev',
      '/api/v1/quotes/search/user/mock_user_id',
      'max_quotes=3',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
    );
    expect(mockQuoteBuilder).toHaveBeenCalledTimes(1);
    expect(mockAddQuotes).toHaveBeenCalledWith([
      { quote: 'Recent Quote 1', author: 'Author 1' },
      { quote: 'Recent Quote 2', author: 'Author 2' },
      { quote: 'Recent Quote 3', author: 'Author 3' },
    ]);
    expect(result).toBe('Mocked Quote Embed');
  });

  test('should return an error if more than 5 quotes are requested', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(6);

    await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockBuildError).toHaveBeenCalledWith(
      mockInteraction,
      new Error("You can only request up to 5 quotes at a time.")
    );
    expect(mockCallerGet).not.toHaveBeenCalled();
  });

  test('should return an empty quote embed if no quotes are found', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(1);
    mockCallerGet.mockResolvedValueOnce({ quotes: [] });

    const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockBuildError).toHaveBeenCalledWith(
      mockInteraction,
      expect.objectContaining({ message: "No quotes found." })
    );
    expect(result).toBe('Mocked Error Embed');
  });

  test('should handle API errors', async () => {
    (mockInteraction.options.getInteger as jest.Mock).mockReturnValueOnce(1);
    const mockError = new Error('API Error');
    mockCallerGet.mockRejectedValueOnce(mockError);

    await quotedbGetCommand.execute(mockInteraction, mockClient);

    expect(mockBuildError).toHaveBeenCalledWith(
      mockInteraction,
      mockError
    );
  });
});