import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, CacheType } from 'discord.js';
import { ExtendedClient } from '../../src/helpers/interfaces.js';

// Mock functions
const mockGenerateCard = jest.fn<() => Promise<any>>();
const mockBuildError = jest.fn<() => Promise<string>>();

// Mock infoCard before import
jest.unstable_mockModule('../../src/helpers/infoCard.js', () => ({
  generateCard: mockGenerateCard
}));

// Mock errorBuilder before import
jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
  buildError: mockBuildError
}));

// Import after mocking
const { default: infoCommand } = await import('../../src/commands/info.js');

// Inline command structure tests
describe('command structure', () => {
  test('should have a data property', () => {
    expect(infoCommand.data).toBeDefined();
  });

  test('should have a name of "info"', () => {
    expect(infoCommand.data.name).toBe('info');
  });

  test('should have a description', () => {
    expect(infoCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(infoCommand.execute).toBeInstanceOf(Function);
  });
});

describe('info command execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return an embed on success', async () => {
    const mockEmbed = { title: 'Test Embed' };
    mockGenerateCard.mockResolvedValue(mockEmbed);
    
    const mockInteraction = {} as unknown as ChatInputCommandInteraction<CacheType>;
    const mockClient = {} as unknown as ExtendedClient;
    const result = await infoCommand.execute(mockInteraction, mockClient);
    
    expect(mockGenerateCard).toHaveBeenCalled();
    expect(result).toEqual({ embeds: [mockEmbed] });
  });

  it('should return an error message on failure', async () => {
    mockGenerateCard.mockRejectedValue(new Error('Card generation failed'));
    mockBuildError.mockResolvedValue('Error message');
    const mockClient = {} as unknown as ExtendedClient;
    const mockInteraction = {} as unknown as ChatInputCommandInteraction<CacheType>;
    const result = await infoCommand.execute(mockInteraction, mockClient);
    
    expect(mockGenerateCard).toHaveBeenCalled();
    expect(mockBuildError).toHaveBeenCalled();
    expect(result).toBe('Error message');
  });
});