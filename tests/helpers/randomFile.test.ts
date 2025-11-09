import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import path from 'path';

// Mock fs module
const mockReaddir = jest.fn<(dir: string, callback: (err: NodeJS.ErrnoException | null, files: string[]) => void) => void>();
const mockStat = jest.fn<(path: string, callback: (err: NodeJS.ErrnoException | null, stats: any) => void) => void>();

jest.unstable_mockModule('fs', () => ({
    default: {
        readdir: mockReaddir,
        stat: mockStat,
    },
}));

// Import after mocks are set up
const { default: getRandomFile } = await import('../../src/helpers/randomFile.js');

describe('getRandomFile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock Math.random to return predictable values
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    test('should return a random file from directory', (done) => {
        const mockFiles = ['file1.txt', 'file2.txt', 'file3.txt'];
        const mockStats = { isFile: () => true };

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            callback(null, mockStats);
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBe('file2.txt'); // Math.random(0.5) * 3 = 1.5 -> index 1
            done();
        });
    });

    test('should handle readdir errors', (done) => {
        const mockError = new Error('Permission denied');

        mockReaddir.mockImplementation((dir, callback) => {
            callback(mockError as NodeJS.ErrnoException, []);
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBe(mockError);
            expect(file).toBeUndefined();
            done();
        });
    });

    test('should return undefined when directory is empty', (done) => {
        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, []);
        });

        getRandomFile('/empty/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBeUndefined();
            done();
        });
    });

    test('should handle stat errors', (done) => {
        const mockFiles = ['file1.txt'];
        const mockError = new Error('File not found');

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            callback(mockError as NodeJS.ErrnoException, null);
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBe(mockError);
            expect(file).toBeUndefined();
            done();
        });
    });

    test('should skip directories and retry with another file', (done) => {
        const mockFiles = ['dir1', 'file1.txt', 'file2.txt'];
        let statCallCount = 0;

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            statCallCount++;
            if (statCallCount === 1) {
                // First call - return directory
                callback(null, { isFile: () => false });
            } else {
                // Second call - return file
                callback(null, { isFile: () => true });
            }
        });

        // Mock random to return different values for retry
        let randomCallCount = 0;
        jest.spyOn(Math, 'random').mockImplementation(() => {
            randomCallCount++;
            return randomCallCount === 1 ? 0.1 : 0.8; // First dir1, then file2.txt
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBeDefined();
            expect(statCallCount).toBe(2); // Should have called stat twice
            done();
        });
    });

    test('should handle multiple non-file entries before finding a file', (done) => {
        const mockFiles = ['dir1', 'dir2', 'file1.txt'];
        let statCallCount = 0;

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            statCallCount++;
            if (statCallCount <= 2) {
                // First two calls - return directories
                callback(null, { isFile: () => false });
            } else {
                // Third call - return file
                callback(null, { isFile: () => true });
            }
        });

        // Mock random to cycle through indices
        let randomCallCount = 0;
        jest.spyOn(Math, 'random').mockImplementation(() => {
            randomCallCount++;
            if (randomCallCount === 1) return 0.1; // index 0 (dir1)
            if (randomCallCount === 2) return 0.1; // index 0 again (dir2, after dir1 removed)
            return 0.9; // index 0 last remaining (file1.txt)
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBe('file1.txt');
            expect(statCallCount).toBe(3);
            done();
        });
    });

    test('should construct correct file paths for stat check', (done) => {
        const mockFiles = ['file1.txt'];
        const mockStats = { isFile: () => true };
        const testDir = '/test/dir';

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            expect(filePath).toBe(path.join(testDir, 'file1.txt'));
            callback(null, mockStats);
        });

        getRandomFile(testDir, (err, file) => {
            expect(err).toBeNull();
            expect(file).toBe('file1.txt');
            done();
        });
    });

    test('should eventually return undefined if all entries are directories', (done) => {
        const mockFiles = ['dir1', 'dir2'];
        
        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            // All entries are directories
            callback(null, { isFile: () => false });
        });

        // Mock random to cycle through all directories
        let randomCallCount = 0;
        jest.spyOn(Math, 'random').mockImplementation(() => {
            randomCallCount++;
            return 0; // Always pick first remaining item
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBeUndefined();
            done();
        });
    });

    test('should work with single file in directory', (done) => {
        const mockFiles = ['onlyfile.txt'];
        const mockStats = { isFile: () => true };

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            callback(null, mockStats);
        });

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBe('onlyfile.txt');
            done();
        });
    });

    test('should correctly splice non-file entries from array', (done) => {
        const mockFiles = ['dir1', 'file1.txt', 'dir2', 'file2.txt'];
        let statCallCount = 0;

        mockReaddir.mockImplementation((dir, callback) => {
            callback(null, mockFiles);
        });

        mockStat.mockImplementation((filePath, callback) => {
            statCallCount++;
            const fileName = filePath.split(path.sep).pop();
            // Directories return false, files return true
            callback(null, { isFile: () => !fileName?.startsWith('dir') });
        });

        // Force it to pick first item each time (which will be removed if it's a dir)
        jest.spyOn(Math, 'random').mockReturnValue(0.01);

        getRandomFile('/test/dir', (err, file) => {
            expect(err).toBeNull();
            expect(file).toBe('file1.txt');
            // Should have checked dir1 (not file), then file1.txt (is file)
            expect(statCallCount).toBe(2);
            done();
        });
    });
});