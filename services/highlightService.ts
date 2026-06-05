/**
 * Highlight creation service.
 *
 * In production builds (EAS / TestFlight / APK): clips using FFmpegKit on-device,
 * then uploads the result to B2 via a presigned URL obtained from the backend.
 * No B2 credentials are stored in the app binary.
 *
 * In dev builds / Expo Go: `isHighlightSupported()` returns false and this
 * module is never evaluated (imported dynamically by useVideoEditorFlow only
 * when !__DEV__), so no native module errors occur.
 */

import * as SecureStore from 'expo-secure-store';

export interface HighlightResult {
  streamUrl: string;
  durationSeconds: number;
  title: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Try to load FFmpegKit — only succeeds in compiled native builds.
let FFmpegKit: any = null;
let ReturnCode: any = null;
try {
  const mod = require('ffmpeg-kit-react-native');
  FFmpegKit = mod.FFmpegKit;
  ReturnCode = mod.ReturnCode;
} catch {
  // Not available in this environment (Expo Go / web).
}

export function isHighlightSupported(): boolean {
  return FFmpegKit !== null;
}

// ── Backend helpers ──────────────────────────────────────────────────────────

async function getB2UploadUrl(
  token: string,
  key: string,
  contentType = 'video/mp4',
): Promise<string> {
  const res = await fetch(
    `${API_URL}/files/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error('No se pudo obtener URL de upload');
  const data = await res.json();
  return data.uploadUrl as string;
}

async function getB2StreamUrl(token: string, key: string): Promise<string> {
  const res = await fetch(
    `${API_URL}/files/stream?key=${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error('No se pudo obtener URL de stream');
  const data = await res.json();
  return data.url as string;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function createHighlight(
  params: {
    videoUrl: string;
    startSec: number;
    endSec: number;
    title: string;
    onProgress?: (pct: number) => void;
  },
): Promise<HighlightResult> {
  if (!isHighlightSupported()) {
    throw new Error('HIGHLIGHT_NOT_SUPPORTED');
  }

  const { videoUrl, startSec, endSec, title, onProgress } = params;
  const duration = Math.round(endSec - startSec);

  // Lazy-import FileSystem so this module loads without errors in Expo Go.
  const { FileSystem } = require('expo-file-system');
  const outPath = `${FileSystem.cacheDirectory}hl_${Date.now()}.mp4`;

  onProgress?.(5);

  // ── FFmpeg: cut without re-encoding (very fast, preserves quality) ──
  const cmd = `-ss ${startSec} -i "${videoUrl}" -t ${duration} -c copy -movflags +faststart "${outPath}"`;

  const session = await FFmpegKit.executeAsync(cmd, undefined, (log: any) => {
    const match = log.getMessage?.()?.match(/time=(\d+):(\d+):(\d+)/);
    if (match && duration > 0) {
      const elapsed = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
      const pct = Math.min(85, 5 + Math.round((elapsed / duration) * 80));
      onProgress?.(pct);
    }
  });

  const rc = await session.getReturnCode();
  if (!ReturnCode.isSuccess(rc)) {
    const logs = await session.getOutput();
    throw new Error(`FFmpeg failed: ${logs?.slice(-300) ?? 'unknown error'}`);
  }

  onProgress?.(88);

  // ── Retrieve auth token from secure storage ──
  const token = await SecureStore.getItemAsync('@torna/auth-token');
  if (!token) throw new Error('Usuario no autenticado');

  // ── Upload clip via presigned URL ──
  const key = `highlights/hl_${Date.now()}.mp4`;
  const uploadUrl = await getB2UploadUrl(token, key, 'video/mp4');

  const uploadRes = await FileSystem.uploadAsync(uploadUrl, outPath, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (uploadRes.status < 200 || uploadRes.status >= 300) {
    throw new Error(`Upload failed: ${uploadRes.status}`);
  }

  // Clean up temp file
  try { await FileSystem.deleteAsync(outPath, { idempotent: true }); } catch {}

  onProgress?.(96);

  // ── Get playback URL ──
  const streamUrl = await getB2StreamUrl(token, key);

  onProgress?.(100);

  return { streamUrl, durationSeconds: duration, title };
}
