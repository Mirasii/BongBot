import { jest } from '@jest/globals';
import type { CommandInteraction } from 'discord.js';

// Mock modules before importing ANYTHING
const mockReaddirSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockBuildError = jest.fn() as jest.MockedFunction<any>;

jest.unstable_mockModule('fs', () => ({
  default: {
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync
  },
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync
}));

jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
  buildError: mockBuildError
}));

// Import after mocking
const { default: command } = await import('../../src/commands/club_kid.js');
const { testCommandStructure } = await import('../utils/commandTestUtils.js');

testCommandStructure(command, 'club_kid');

describe('club_kid command', () => {
  describe('execution', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockBuildError.mockResolvedValue({ isError: true });
    });

    it('should return a random video file from the clubkid directory', async () => {
      const files = ['kid1.mp4', 'kid2.mp4', 'kid3.mp4', 'notavideo.txt'];
      mockReaddirSync.mockReturnValue(files);
      mockReadFileSync.mockReturnValue('mock file content');
      
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const mockInteraction = {} as CommandInteraction;
      const result = await command.execute(mockInteraction);
      
      expect(result).toHaveProperty('files');
      const file = result.files[0];
      expect(file).toHaveProperty('attachment', 'mock file content');
      expect(file.name).toBe('kid2.mp4');
      
      randomSpy.mockRestore();
    });

    it('should handle case when no mp4 files are found', async () => {
      const files = ['notavideo.txt', 'README.md'];
      mockReaddirSync.mockReturnValue(files);
      
      const mockInteraction = {} as CommandInteraction;
      
      await command.execute(mockInteraction);
      
      expect(mockBuildError).toHaveBeenCalledWith(
        mockInteraction,
        expect.any(Error)
      );
      expect((mockBuildError.mock.calls[0][1] as Error).message).toBe(
        'No clubkid videos found.'
      );
    });

    it('should abstract errors with buildError function', async () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });
      
      const mockInteraction = {} as CommandInteraction;
      
      await command.execute(mockInteraction);
      
      expect(mockBuildError).toHaveBeenCalledWith(
        mockInteraction,
        expect.any(Error)
      );
    });
  });
});