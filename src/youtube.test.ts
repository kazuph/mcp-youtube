
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTranscript, getVideoMetadata } from './youtube.js';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

const SAMPLE_METADATA_OUTPUT = `Sample Title
Sample description line 1
Sample description line 2`;
const SAMPLE_VTT = `WEBVTT

00:00:00.000 --> 00:00:01.000
Hello world!

00:00:01.500 --> 00:00:03.000
This is a test.
`;

const spawnPromiseMock = vi.hoisted(() => vi.fn());

vi.mock('spawn-rx', () => ({
  spawnPromise: (...args: readonly string[]) => spawnPromiseMock(...args),
}));

function ensureTranscriptWritten(args: readonly string[]) {
  const outputIndex = args.indexOf('--output');
  if (outputIndex === -1) {
    throw new Error('Missing --output argument in spawnPromise mock');
  }

  const template = args[outputIndex + 1];
  const langIndex = args.indexOf('--sub-lang');
  const language = langIndex !== -1 ? args[langIndex + 1] : 'ja';

  const transcriptPath = template.replace('%(id)s', 'test-video').replace('%(ext)s', `${language}.vtt`);
  fs.mkdirSync(path.dirname(transcriptPath), { recursive: true });
  fs.writeFileSync(transcriptPath, SAMPLE_VTT, 'utf8');
}

describe('YouTube Transcript Extractor', () => {
  const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=x99-eKSyUqU';

  beforeEach(() => {
    vi.clearAllMocks();
    spawnPromiseMock.mockImplementation(async (_command: string, args: readonly string[]) => {
      if (args.includes('--print')) {
        return SAMPLE_METADATA_OUTPUT;
      }

      if (args.includes('--write-sub')) {
        ensureTranscriptWritten(args);
        return '';
      }

      return '';
    });
  });

  it('should extract transcript from the test video', async () => {
    const transcript = await getTranscript(TEST_VIDEO_URL);
    expect(transcript).toBe('Hello world!\nThis is a test.');
    expect(spawnPromiseMock).toHaveBeenCalled();
  });

  it('should extract transcript with specified language', async () => {
    const transcript = await getTranscript(TEST_VIDEO_URL, { language: 'en' });
    expect(transcript).toBe('Hello world!\nThis is a test.');
    expect(spawnPromiseMock).toHaveBeenCalledWith(
      'yt-dlp',
      expect.arrayContaining(['--sub-lang', 'en'])
    );
  });

  it('should use custom temp directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-test-'));
    try {
      const transcript = await getTranscript(TEST_VIDEO_URL, { language: 'ja', tempDir });
      expect(transcript).toBe('Hello world!\nThis is a test.');
      expect(fs.existsSync(tempDir)).toBe(true);
      const files = fs.readdirSync(tempDir);
      expect(files.some((file) => file.endsWith('.vtt'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should get video metadata', async () => {
    const metadata = await getVideoMetadata(TEST_VIDEO_URL);
    expect(metadata).toEqual({
      title: 'Sample Title',
      description: 'Sample description line 1\nSample description line 2',
    });
  });
});
