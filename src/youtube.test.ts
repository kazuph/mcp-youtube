import { describe, it, expect } from 'vitest';
import { getTranscript, getVideoMetadata } from './youtube.js';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

describe('YouTube Transcript Extractor', () => {
  const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=x99-eKSyUqU';

  it('should extract transcript from the test video', async () => {
    try {
      const transcript = await getTranscript(TEST_VIDEO_URL);
      expect(transcript).toBeDefined();
      expect(typeof transcript).toBe('string');
      expect(transcript.length).toBeGreaterThan(0);
      console.log('Transcript:', transcript);
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
  });

  it('should extract transcript with specified language', async () => {
    try {
      const transcript = await getTranscript(TEST_VIDEO_URL, { language: 'ja' });
      expect(transcript).toBeDefined();
      expect(typeof transcript).toBe('string');
      expect(transcript.length).toBeGreaterThan(0);
      console.log('Japanese transcript:', transcript);
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
  });

  it('should use custom temp directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-test-'));
    try {
      const transcript = await getTranscript(TEST_VIDEO_URL, { tempDir });
      expect(transcript).toBeDefined();
      expect(fs.existsSync(tempDir)).toBe(true);
      const files = fs.readdirSync(tempDir);
      console.log('Files in temp directory:', files);
      console.log('Transcript with custom temp dir:', transcript);
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should get video metadata', async () => {
    try {
      const metadata = await getVideoMetadata(TEST_VIDEO_URL);
      expect(metadata).toBeDefined();
      expect(metadata.title).toBeDefined();
      expect(metadata.description).toBeDefined();
      expect(typeof metadata.title).toBe('string');
      expect(typeof metadata.description).toBe('string');
      expect(metadata.title.length).toBeGreaterThan(0);
      console.log('Video metadata:', metadata);
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
  });
});
