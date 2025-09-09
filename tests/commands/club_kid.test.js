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
        it('should return a random video file from the clubkid directory', async () => {
            const files = ['kid1.mp4', 'kid2.mp4', 'kid3.mp4', 'kid4.mp4'];
            fs.readdirSync.mockReturnValue(files);
            fs.readFileSync.mockReturnValue('mock file content');
            // Mock Math.random to control the outcome
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // Will result in num = Math.floor(0.5 * 4) + 1 = 3
            const result = await command.execute();
            expect(fs.readdirSync).toHaveBeenCalledWith('./src/clubkid');
            expect(result).toHaveProperty('files');
            const file = result.files[0];
            expect(file).toHaveProperty('attachment', 'mock file content');
            expect(file.name).toBe('kid3.mp4');
            expect(fs.readFileSync).toHaveBeenCalledWith('./src/clubkid/kid3.mp4');

            randomSpy.mockRestore();
        });

        it('should abstract errors with buildError function', async () => {
            const error = new Error('Directory not found');
            fs.readdirSync.mockImplementation(() => {
                throw error;
            });
            const mockInteraction = {}; // Mock interaction object
            await command.execute(mockInteraction);
            expect(buildError).toHaveBeenCalledWith(mockInteraction, error);
        });
    });
});
