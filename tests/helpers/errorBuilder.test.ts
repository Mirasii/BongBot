import { jest } from '@jest/globals';
import { MessageFlags, Colors } from 'discord.js';

// Mock functions
const mockLog = jest.fn();
const mockSetTitle = jest.fn<any>().mockReturnThis();
const mockSetColor = jest.fn<any>().mockReturnThis();
const mockToJSON = jest.fn<any>();
const mockConstructEmbedWithRandomFile = jest.fn<() => Promise<any>>();

// Setup mockToJSON to return dynamic values
mockToJSON.mockImplementation(() => ({
  mockEmbed: true,
  title: mockSetTitle.mock.calls[0]?.[0] || '',
  color: mockSetColor.mock.calls[0]?.[0] || null,
}));

const mockEmbedBuilder = jest.fn().mockImplementation(() => ({
  setTitle: mockSetTitle,
  setColor: mockSetColor,
  toJSON: mockToJSON,
}));

// Mock logging before import
jest.unstable_mockModule('../../src/services/logging_service.js', () => ({
  default: {
    log: mockLog,
  },
}));

// Mock embedBuilder before import
jest.unstable_mockModule('../../src/helpers/embedBuilder.js', () => ({
  default: mockEmbedBuilder,
}));

// Setup constructEmbedWithRandomFile mock
mockConstructEmbedWithRandomFile.mockImplementation(async () => ({
  embeds: [{
    mockEmbed: true,
    title: mockSetTitle.mock.calls[0]?.[0] || '',
    color: mockSetColor.mock.calls[0]?.[0] || null,
  }],
  files: [{ name: 'mockFile.png' }],
}));

// Reconfigure mockEmbedBuilder to return the mock with constructEmbedWithRandomFile
mockEmbedBuilder.mockImplementation(() => ({
  constructEmbedWithRandomFile: mockConstructEmbedWithRandomFile,
}));

// Import after mocking
const errorBuilder = await import('../../src/helpers/errorBuilder.js');

describe('errorBuilder helper', () => {
  // Create a mock embed instance that will be returned
  const createMockEmbedInstance = () => ({
    setTitle: mockSetTitle,
    setColor: mockSetColor,
    toJSON: mockToJSON,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to prevent actual logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset mock implementations
    mockSetTitle.mockClear().mockReturnThis();
    mockSetColor.mockClear().mockReturnThis();
    mockToJSON.mockClear();
    
    // Reset constructEmbedWithRandomFile
    mockConstructEmbedWithRandomFile.mockClear().mockImplementation(async () => ({
      embeds: [createMockEmbedInstance()],
      files: [{ name: 'mockFile.png' }],
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('buildError should correctly build an error embed with command name', async () => {
    const mockInteraction = { commandName: 'testCommand' };
    const mockError = new Error('Test Error Message');

    const result = await errorBuilder.buildError(mockInteraction as any, mockError);

    expect(mockLog).toHaveBeenCalledWith(mockError);
    expect(mockEmbedBuilder).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      embeds: [{
        mockEmbed: true,
        title: 'There was an error while executing the "testCommand" command.',
        color: Colors.Red,
      }],
      files: [{ name: 'mockFile.png' }],
      flags: MessageFlags.Ephemeral,
      isError: true,
    });
  });

  test('buildError should correctly build an error embed for unknown command', async () => {
    const mockInteraction = { commandName: undefined };
    const mockError = new Error('Test Error Message');

    const result = await errorBuilder.buildError(mockInteraction as any, mockError);

    expect(mockLog).toHaveBeenCalledWith(mockError);
    expect(mockEmbedBuilder).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      embeds: [{
        mockEmbed: true,
        title: 'There was an error while executing the "unknown" command.',
        color: Colors.Red,
      }],
      files: [{ name: 'mockFile.png' }],
      flags: MessageFlags.Ephemeral,
      isError: true,
    });
  });

  test('buildUnknownError should correctly build an error embed with default message', async () => {
    const mockError = new Error('Unexpected Error');

    const result = await errorBuilder.buildUnknownError(mockError);

    expect(mockLog).toHaveBeenCalledWith(mockError);
    expect(mockEmbedBuilder).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      embeds: [{
        mockEmbed: true,
        title: 'Leave me alone! I\'m not talking to you! (there was an unexpected error)',
        color: Colors.Red,
      }],
      files: [{ name: 'mockFile.png' }],
      flags: MessageFlags.Ephemeral,
      isError: true,
    });
  });
});