import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readDirectoryRecursive } from '../directory.js';

describe('directory', () => {
  describe('readDirectoryRecursive', () => {
    let mockDirEntry;
    let mockReader;
    let mockProgress;
    let mockT;

    beforeEach(() => {
      mockProgress = {
        update: vi.fn(),
      };
      mockT = vi.fn((key) => key);
    });

    it('returns empty array for null/undefined dirEntry', async () => {
      const result1 = await readDirectoryRecursive(null);
      expect(result1).toEqual([]);

      const result2 = await readDirectoryRecursive(undefined);
      expect(result2).toEqual([]);
    });

    it('returns empty array for invalid dirEntry', async () => {
      const invalidEntry = { name: 'test' }; // Missing createReader
      const result = await readDirectoryRecursive(invalidEntry);
      expect(result).toEqual([]);
    });

    it('reads files from directory', async () => {
      const mockFile1 = { name: 'file1.jpg', size: 1000 };
      const mockFile2 = { name: 'file2.mp3', size: 2000 };

      const mockFileEntry1 = {
        name: 'file1.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile1)),
      };

      const mockFileEntry2 = {
        name: 'file2.mp3',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile2)),
      };

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockFileEntry1, mockFileEntry2]))
          .mockImplementationOnce((resolve) => resolve([])), // End of entries
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      const result = await readDirectoryRecursive(mockDirEntry);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockFile1);
      expect(result[1]).toBe(mockFile2);
    });

    it('skips system files', async () => {
      const mockFile = { name: 'regular.jpg', size: 1000 };
      const mockSystemFile = { name: '.DS_Store', size: 100 };

      const mockFileEntry = {
        name: 'regular.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile)),
      };

      const mockSystemEntry = {
        name: '.DS_Store',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockSystemFile)),
      };

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockFileEntry, mockSystemEntry]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      const result = await readDirectoryRecursive(mockDirEntry);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockFile);
    });

    it('recursively reads subdirectories', async () => {
      const mockFile1 = { name: 'file1.jpg', size: 1000 };
      const mockFile2 = { name: 'file2.jpg', size: 2000 };

      const mockFileEntry = {
        name: 'file1.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile1)),
      };

      const mockSubReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([{
            name: 'file2.jpg',
            isFile: true,
            isDirectory: false,
            file: vi.fn((resolve) => resolve(mockFile2)),
          }]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      const mockSubDirEntry = {
        name: 'subdir',
        isFile: false,
        isDirectory: true,
        createReader: vi.fn(() => mockSubReader),
      };

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockFileEntry, mockSubDirEntry]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      const result = await readDirectoryRecursive(mockDirEntry);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockFile1);
      expect(result[1]).toBe(mockFile2);
    });

    it('updates progress during reading', async () => {
      const mockFile = { name: 'file.jpg', size: 1000 };

      const mockFileEntry = {
        name: 'file.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile)),
      };

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockFileEntry]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      await readDirectoryRecursive(mockDirEntry, { progress: mockProgress, t: mockT });

      expect(mockProgress.update).toHaveBeenCalled();
      expect(mockProgress.update.mock.calls[0][0]).toBeGreaterThanOrEqual(10); // Percent
      expect(mockProgress.update.mock.calls[0][1]).toBe('readingFolder');
    });

    it('increments counter across multiple files', async () => {
      const mockFiles = [
        { name: 'file1.jpg', size: 1000 },
        { name: 'file2.jpg', size: 1000 },
        { name: 'file3.jpg', size: 1000 },
      ];

      const mockEntries = mockFiles.map((file) => ({
        name: file.name,
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(file)),
      }));

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve(mockEntries))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      const counter = { value: 0 };
      await readDirectoryRecursive(mockDirEntry, { progress: mockProgress, t: mockT, counter });

      expect(counter.value).toBe(3);
    });

    it('handles multiple readEntries calls', async () => {
      const mockFile1 = { name: 'file1.jpg', size: 1000 };
      const mockFile2 = { name: 'file2.jpg', size: 2000 };

      const mockEntry1 = {
        name: 'file1.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile1)),
      };

      const mockEntry2 = {
        name: 'file2.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile2)),
      };

      // Simulate pagination - reader returns entries in batches
      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockEntry1]))
          .mockImplementationOnce((resolve) => resolve([mockEntry2]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      const result = await readDirectoryRecursive(mockDirEntry);

      expect(result).toHaveLength(2);
      expect(mockReader.readEntries).toHaveBeenCalledTimes(3);
    });

    it('handles readEntries errors gracefully', async () => {
      mockReader = {
        readEntries: vi.fn((resolve, reject) => {
          reject(new Error('Read error'));
        }),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      await expect(readDirectoryRecursive(mockDirEntry)).rejects.toThrow('Read error');
    });

    it('handles file() errors gracefully', async () => {
      const mockFileEntry = {
        name: 'corrupted.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve, reject) => reject(new Error('File access error'))),
      };

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockFileEntry]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      await expect(readDirectoryRecursive(mockDirEntry)).rejects.toThrow('File access error');
    });

    it('uses translate function for progress messages', async () => {
      const mockFile = { name: 'file.jpg', size: 1000 };

      const mockFileEntry = {
        name: 'file.jpg',
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(mockFile)),
      };

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve([mockFileEntry]))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      await readDirectoryRecursive(mockDirEntry, { progress: mockProgress, t: mockT });

      expect(mockT).toHaveBeenCalledWith('filesProcessed', undefined);
    });

    it('caps progress at 90%', async () => {
      const mockFiles = Array.from({ length: 50 }, (_, i) => ({
        name: `file${i}.jpg`,
        size: 1000,
      }));

      const mockEntries = mockFiles.map((file) => ({
        name: file.name,
        isFile: true,
        isDirectory: false,
        file: vi.fn((resolve) => resolve(file)),
      }));

      mockReader = {
        readEntries: vi.fn()
          .mockImplementationOnce((resolve) => resolve(mockEntries))
          .mockImplementationOnce((resolve) => resolve([])),
      };

      mockDirEntry = {
        name: 'testDir',
        createReader: vi.fn(() => mockReader),
      };

      await readDirectoryRecursive(mockDirEntry, { progress: mockProgress, t: mockT });

      // Check that all progress updates are <= 90
      mockProgress.update.mock.calls.forEach(([percent]) => {
        expect(percent).toBeLessThanOrEqual(90);
      });
    });
  });
});
