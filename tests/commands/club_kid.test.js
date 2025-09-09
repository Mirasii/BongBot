const command = require('../../src/commands/club_kid');
const fs = require('fs');
const { buildError } = require('../../src/helpers/errorBuilder');
const { testCommandStructure } = require('../utils/commandTestUtils.js');

// Mock dependencies
jest.mock('fs');
jest.mock('../../src/helpers/errorBuilder');


testCommandStructure(command, 'club_kid');
describe('club_kid command', () => {

    // Test command execution
    describe('execution', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            buildError.mockResolvedValue({ isError: true });
        });

        it('should return a random video file from the clubkid directory', async () => {
            const files = ['kid1.mp4', 'kid2.mp4', 'kid3.mp4', 'notavideo.txt'];
            fs.readdirSync.mockReturnValue(files);
            fs.readFileSync.mockReturnValue('mock file content');
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
            const result = await command.execute();
            expect(result).toHaveProperty('files');
            const file = result.files[0];
            expect(file).toHaveProperty('attachment', 'mock file content');
            expect(file.name).toBe('kid2.mp4');
            randomSpy.mockRestore();
        });

        it('should handle case when no mp4 files are found', async () => {
            const files = ['notavideo.txt', 'README.md'];
            fs.readdirSync.mockReturnValue(files);
            const mockInteraction = {};
            await command.execute(mockInteraction);
            expect(buildError).toHaveBeenCalledWith(mockInteraction, expect.any(Error));
            expect(buildError.mock.calls[0][1].message).toBe('No clubkid videos found.');
        });

        it('should abstract errors with buildError function', async () => {
            fs.readdirSync.mockImplementation(() => {throw new Error('Directory not found');});
            const mockInteraction = {};
            await command.execute(mockInteraction);
            expect(buildError).toHaveBeenCalledWith(mockInteraction, expect.any(Error));
        });
    });
});
