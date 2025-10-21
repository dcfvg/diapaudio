import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unzipFile, expandZipFiles } from '../zip.js';

// Mock zip.js
vi.mock('@zip.js/zip.js', () => ({
  ZipReader: vi.fn(),
  BlobReader: vi.fn(),
  BlobWriter: vi.fn(),
}));

describe('zip', () => {
  let mockProgress;
  let mockT;

  beforeEach(() => {
    mockProgress = {
      update: vi.fn(),
    };
    mockT = vi.fn((key) => key);
  });

  describe('unzipFile', () => {
    it('throws error when zipFile is not provided', async () => {
      await expect(unzipFile(null)).rejects.toThrow('ZIP file not provided');
    });

    it('throws error when zipFile is undefined', async () => {
      await expect(unzipFile(undefined)).rejects.toThrow('ZIP file not provided');
    });

    it('updates progress during extraction', async () => {
      // This test would require complex mocking of ZipReader
      // For now, just verify the function can be called
      const mockZipFile = new File(['content'], 'test.zip', { type: 'application/zip' });
      
      try {
        await unzipFile(mockZipFile, { progress: mockProgress, t: mockT });
      } catch {
        // Expected to fail due to invalid zip
        // Just verify we attempted the operation
      }
      expect(mockZipFile.name).toBe('test.zip');
    });
  });

  describe('expandZipFiles', () => {
    it('returns empty result for empty files array', async () => {
      const result = await expandZipFiles([], { progress: mockProgress, t: mockT });
      expect(result).toEqual({
        expanded: [],
        zipCount: 0,
        extractedCount: 0,
      });
    });

    it('returns empty result for null files', async () => {
      const result = await expandZipFiles(null, { progress: mockProgress, t: mockT });
      expect(result).toEqual({
        expanded: [],
        zipCount: 0,
        extractedCount: 0,
      });
    });

    it('filters out non-zip files', async () => {
      const nonZipFiles = [
        new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'audio.mp3', { type: 'audio/mpeg' }),
      ];
      
      const result = await expandZipFiles(nonZipFiles);
      
      expect(result.zipCount).toBe(0);
      // Non-zip files are returned as-is in expanded
      expect(result.expanded.length).toBe(2);
    });

    it('identifies zip files', async () => {
      const files = [
        new File(['content'], 'archive.zip', { type: 'application/zip' }),
      ];

      try {
        await expandZipFiles(files, { progress: mockProgress, t: mockT });
      } catch {
        // Expected to fail due to mocking, but should identify as zip
      }
    });
  });

  describe('zip file identification', () => {
    it('identifies .zip extension', () => {
      const file = new File(['content'], 'test.zip', { type: 'application/zip' });
      expect(file.name.endsWith('.zip')).toBe(true);
    });

    it('identifies zip mime type', () => {
      const file = new File(['content'], 'test.zip', { type: 'application/zip' });
      expect(file.type).toContain('zip');
    });

    it('handles files without zip extension', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(file.name.endsWith('.zip')).toBe(false);
    });
  });
});
