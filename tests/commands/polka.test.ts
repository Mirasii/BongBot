import { jest } from '@jest/globals';
import type { Client, ChatInputCommandInteraction, CacheType } from 'discord.js';

// Mock functions
const mockSearchImage = jest.fn<() => Promise<string>>();
const mockBuildError = jest.fn<() => Promise<any>>();

// Mock googleSearch before import
jest.unstable_mockModule('../../src/helpers/googleSearch.js', () => ({
  searchImage: mockSearchImage
}));

// Mock errorBuilder before import
jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
  buildError: mockBuildError
}));

// Import after mocking
const { default: polkaCommand } = await import('../../src/commands/polka.js');

// Inline command structure tests
describe('command structure', () => {
  test('should have a data property', () => {
    expect(polkaCommand.data).toBeDefined();
  });

  test('should have a name of "clown"', () => {
    expect(polkaCommand.data.name).toBe('clown');
  });

  test('should have a description', () => {
    expect(polkaCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(polkaCommand.execute).toBeInstanceOf(Function);
  });
});

describe('polka command', () => {
  const mockInteraction = {
    reply: jest.fn(),
  } as unknown as ChatInputCommandInteraction<CacheType>;

  const mockClient = {} as unknown as Client;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should successfully return an image URL', async () => {
    mockSearchImage.mockResolvedValueOnce('http://example.com/polka_image.jpg');

    const result = await polkaCommand.execute(mockInteraction);

    expect(mockSearchImage).toHaveBeenCalledWith('Omaru Polka');
    expect(result).toBe('http://example.com/polka_image.jpg');
  });

  test('should handle errors from google.searchImage', async () => {
    const mockError = new Error('Google Search Error');
    mockSearchImage.mockRejectedValueOnce(mockError);

    await polkaCommand.execute(mockInteraction);

    expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, mockError);
  });
});