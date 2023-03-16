const { SlashCommandBuilder } = require('@discordjs/builders');
const Cleverbot = require('cleverbot');
const commandModule = require('./command.js');

// mock interaction and message objects
const mockInteraction = {
  user: { id: '1234567890' },
  options: { get: jest.fn().mockReturnValue({ value: 'test input' }) },
  reply: jest.fn(),
};
const mockMessage = {
  author: { id: '1234567890' },
  content: '<@1234567890> test input',
  reply: jest.fn(),
};

// mock Cleverbot object and its methods
jest.mock('cleverbot');
const mockCleverbort = {
  query: jest.fn().mockResolvedValue({ output: 'test response', cs: 'test cs' }),
};
Cleverbot.mockImplementation(() => mockCleverbort);

describe('talk command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should reply with error message if query fails', async () => {
    mockCleverbort.query.mockRejectedValueOnce(new Error('test error'));
    const result = await commandModule.execute(mockInteraction);
    expect(result).toBe('Error talking to BongBot, guess she doesn\'t like you!');
    expect(mockCleverbort.query).toHaveBeenCalledWith('test input', '');
    expect(mockInteraction.options.get).toHaveBeenCalledWith('input');
    expect(mockInteraction.reply).not.toHaveBeenCalled();
    expect(mockCleverbort.query).toHaveBeenCalledTimes(1);
  });

  test('should execute legacy code', async () => {
    const result = await commandModule.executeLegacy(mockMessage);
    expect(result).toBeUndefined();
    expect(mockCleverbort.query).toHaveBeenCalledWith('test input', '');
    expect(mockMessage.reply).toHaveBeenCalledWith('test response');
    expect(csMap.get(mockMessage.author.id)).toBe('test cs');
    expect(mockCleverbort.query).toHaveBeenCalledTimes(1);
  });
});
