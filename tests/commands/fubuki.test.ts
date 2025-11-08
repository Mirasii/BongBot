import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, CacheType } from 'discord.js';

// Mock functions
const mockSearchImage = jest.fn<() => Promise<string>>();
const mockBuildError = jest.fn<() => Promise<string>>();

// Mock googleSearch before import
jest.unstable_mockModule('../../src/helpers/googleSearch.js', () => ({
  searchImage: mockSearchImage
}));

// Mock errorBuilder before import
jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
  buildError: mockBuildError
}));

// Import after mocking
const { default: fubukiCommand } = await import('../../src/commands/fubuki.js');

// Inline command structure tests
describe('command structure', () => {
  test('should have a data property', () => {
    expect(fubukiCommand.data).toBeDefined();
  });

  test('should have a name of "fox"', () => {
    expect(fubukiCommand.data.name).toBe('fox');
  });

  test('should have a description', () => {
    expect(fubukiCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(fubukiCommand.execute).toBeInstanceOf(Function);
  });
});

describe('fubuki command execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return an image URL on success', async () => {
    mockSearchImage.mockResolvedValue('http://example.com/fubuki.jpg');
    
    const mockInteraction = {} as unknown as ChatInputCommandInteraction<CacheType>;
    const result = await fubukiCommand.execute(mockInteraction);
    
    expect(mockSearchImage).toHaveBeenCalledWith('Shirakami Fubuki');
    expect(result).toBe('http://example.com/fubuki.jpg');
  });

  it('should return an error message on failure', async () => {
    mockSearchImage.mockRejectedValue(new Error('Search failed'));
    mockBuildError.mockResolvedValue('Error message');
    
    const mockInteraction = {} as unknown as ChatInputCommandInteraction<CacheType>;
    const result = await fubukiCommand.execute(mockInteraction);
    
    expect(mockSearchImage).toHaveBeenCalledWith('Shirakami Fubuki');
    expect(mockBuildError).toHaveBeenCalled();
    expect(result).toBe('Error message');
  });
});