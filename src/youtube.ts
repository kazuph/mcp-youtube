import { spawnPromise } from 'spawn-rx';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { rimraf } from 'rimraf';

export interface TranscriptOptions {
  language?: string;
  tempDir?: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
}

export class YouTubeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YouTubeError';
  }
}

export async function getVideoMetadata(url: string): Promise<VideoMetadata> {
  const args = [
    '--skip-download',
    '--print',
    '%(title)s\n%(description)s',
    url,
  ];

  try {
    const result = await spawnPromise('yt-dlp', args);
    const [title, ...descriptionParts] = result.split('\n');
    const description = descriptionParts.join('\n');

    return {
      title: title.trim(),
      description: description.trim(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new YouTubeError(`Failed to get video metadata: ${error.message}`);
    }
    throw error;
  }
}

export async function getTranscript(
  url: string,
  options: TranscriptOptions = {}
): Promise<string> {
  const tempDir =
    options.tempDir || fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
  const args = [
    '--write-sub',
    '--write-auto-sub',
    '--sub-lang',
    options.language || 'ja',
    '--skip-download',
    '--sub-format',
    'vtt',
    '--output',
    path.join(tempDir, '%(title)s.%(ext)s'),
    '--verbose',
    url,
  ];

  try {
    const result = await spawnPromise('yt-dlp', args);
    console.log('yt-dlp output:', result);

    const files = fs.readdirSync(tempDir);
    console.log('Files in temp directory:', files);
    const subtitleFiles = files.filter(
      (file) => file.endsWith('.vtt') || file.endsWith('.srt')
    );

    if (subtitleFiles.length === 0) {
      throw new YouTubeError('No transcript found for this video');
    }

    const content = fs.readFileSync(
      path.join(tempDir, subtitleFiles[0]),
      'utf8'
    );

    return cleanTranscript(content);
  } catch (error) {
    if (error instanceof Error) {
      throw new YouTubeError(`Failed to get transcript: ${error.message}`);
    }
    throw error;
  } finally {
    if (!options.tempDir) {
      rimraf.sync(tempDir);
    }
  }
}

function cleanTranscript(content: string): string {
  // VTTまたはSRTファイルから余分な情報を削除し、純粋なテキストを抽出
  const lines = content.split('\n');
  let cleanedText = '';
  let isSubtitleText = false;
  const seenLines = new Set<string>(); // 重複チェック用のSet

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 数字のみの行（字幕番号）をスキップ
    if (/^\d+$/.test(trimmedLine)) {
      continue;
    }

    // タイムスタンプ行をスキップ
    if (trimmedLine.includes('-->')) {
      isSubtitleText = true;
      continue;
    }

    // 空行をスキップ
    if (trimmedLine === '') {
      isSubtitleText = false;
      continue;
    }

    // VTTのヘッダーをスキップ
    if (trimmedLine === 'WEBVTT') {
      continue;
    }

    // HTMLタグを削除して字幕テキストを追加
    if (isSubtitleText) {
      const cleanLine = trimmedLine.replace(/<[^>]*>/g, '').trim();
      if (cleanLine && !seenLines.has(cleanLine)) {
        // 重複チェック
        cleanedText += cleanLine + '\n';
        seenLines.add(cleanLine);
      }
    }
  }

  return cleanedText.trim();
}
