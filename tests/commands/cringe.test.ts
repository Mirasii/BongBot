import { jest } from '@jest/globals';
import type { Client, ChatInputCommandInteraction, CacheType } from 'discord.js';

// Mock functions must be defined before unstable_mockModule
const mockBuild = jest.fn<() => Promise<any>>().mockResolvedValue({ 
  files: [{ attachment: 'mock-attachment', name: 'cringe.png' }] 
});
const mockAddDefaultFooter = jest.fn<any>().mockReturnValue({ build: mockBuild });
const mockConstructEmbedWithImage = jest.fn<any>().mockReturnValue({ 
  addDefaultFooter: mockAddDefaultFooter 
});
const mockBuildError = jest.fn<() => Promise<any>>().mockResolvedValue({
  embeds: [],
  files: [],
  flags: 64,
  isError: true
});

// Mock embedBuilder before any imports that use it
jest.unstable_mockModule('../../src/helpers/embedBuilder.js', () => ({
  default: jest.fn().mockImplementation(() => ({
    constructEmbedWithImage: mockConstructEmbedWithImage
  }))
}));

// Mock errorBuilder before any imports that use it
jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
  buildError: mockBuildError
}));

// Now import the command (after mocks are set up)
const { default: cringeCommand } = await import('../../src/commands/cringe.js') as { default: any };

// Import and run test utilities inline to avoid module resolution issues
describe('command structure', () => {
  test('should have a data property', () => {
    expect(cringeCommand.data).toBeDefined();
  });

  test('should have a name of "cringe"', () => {
    expect(cringeCommand.data.name).toBe('cringe');
  });

  test('should have a description', () => {
    expect(cringeCommand.data.description).toBeTruthy();
  });

  test('should have an execute method', () => {
    expect(cringeCommand.execute).toBeInstanceOf(Function);
  });
});

describe('cringe command execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuild.mockResolvedValue({ 
      files: [{ attachment: 'mock-attachment', name: 'cringe.png' }] 
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return the correct file object', async () => {
    const mockInteraction = {} as unknown as ChatInputCommandInteraction<CacheType>;
    const mockClient = { 
      version: '1.0.0', 
      user: { 
        displayAvatarURL: jest.fn().mockReturnValue('http://example.com/avatar.png') 
      } 
    } as unknown as Client;
    
    const result = await cringeCommand.execute(mockInteraction, mockClient);
    
    expect(mockConstructEmbedWithImage).toHaveBeenCalledWith('cringe.png');
    expect(mockAddDefaultFooter).toHaveBeenCalledWith(mockClient);
    expect(mockBuild).toHaveBeenCalled();
    expect(result).toHaveProperty('files');
    expect((result as any).files[0]).toHaveProperty('attachment');
    expect((result as any).files[0].name).toBe('cringe.png');
  });

  it('should handle error scenarios', async () => {
    // Make the build function throw an error for this test
    mockBuild.mockRejectedValueOnce(new Error('Build failed'));

    const mockInteraction = {
      commandName: 'cringe'
    } as unknown as ChatInputCommandInteraction<CacheType>;
    const mockClient = { 
      version: '1.0.0', 
      user: { 
        displayAvatarURL: jest.fn().mockReturnValue('http://example.com/avatar.png') 
      } 
    } as unknown as Client;

    const result = await cringeCommand.execute(mockInteraction, mockClient);
    expect(result).toHaveProperty('isError', true);
    expect(result).toHaveProperty('embeds');
    expect(result).toHaveProperty('files');
    expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
  });
});