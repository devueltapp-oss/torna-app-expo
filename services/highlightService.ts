/**
 * Highlight creation service.
 *
 * In production builds (EAS / TestFlight / APK): clips using FFmpegKit on-device
 * and uploads the result directly to Backblaze B2.
 *
 * In dev builds / Expo Go: `isHighlightSupported()` returns false and this
 * module is never evaluated (imported dynamically by useVideoEditorFlow only
 * when !__DEV__), so no native module errors occur.
 *
 * When the real backend is ready: replace the body of `createHighlight` with
 * a single fetch call to the backend endpoint. No other files need to change.
 */

export interface HighlightResult {
  streamUrl: string;
  durationSeconds: number;
  title: string;
}

// ── B2 config — values come from .env (EXPO_PUBLIC_* are inlined at build time) ──
const B2_KEY_ID    = process.env.EXPO_PUBLIC_B2_KEY_ID    ?? '';
const B2_APP_KEY   = process.env.EXPO_PUBLIC_B2_APP_KEY   ?? '';
const BUCKET_ID    = process.env.EXPO_PUBLIC_B2_BUCKET_ID ?? '';
const BUCKET_NAME  = process.env.EXPO_PUBLIC_B2_BUCKET_NAME ?? 'torna-videos';

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
    // Parse time= from FFmpeg output to estimate progress
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

  // ── Upload clip to B2 ──
  const streamUrl = await uploadToB2(outPath, `highlights/hl_${Date.now()}.mp4`);

  // Clean up temp file
  try { await FileSystem.deleteAsync(outPath, { idempotent: true }); } catch {}

  onProgress?.(100);

  return { streamUrl, durationSeconds: duration, title };
}

async function uploadToB2(localPath: string, fileName: string): Promise<string> {
  // 1. Auth
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: 'Basic ' + btoa(`${B2_KEY_ID}:${B2_APP_KEY}`) },
  });
  if (!authRes.ok) throw new Error(`B2 auth failed: ${authRes.status}`);
  const auth = await authRes.json();
  const apiUrl      = auth.apiInfo.storageApi.apiUrl;
  const authToken   = auth.authorizationToken;
  const downloadUrl = auth.apiInfo.storageApi.downloadUrl;

  // 2. Get upload URL
  const upUrlRes = await fetch(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: BUCKET_ID }),
  });
  if (!upUrlRes.ok) throw new Error(`B2 get_upload_url failed: ${upUrlRes.status}`);
  const { uploadUrl, authorizationToken: uploadToken } = await upUrlRes.json();

  // 3. Read file as blob and upload
  const fileBlob = await fetch(localPath).then(r => r.blob());

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadToken,
      'X-Bz-File-Name': encodeURIComponent(fileName),
      'Content-Type': 'video/mp4',
      'X-Bz-Content-Sha1': 'do_not_verify',
    },
    body: fileBlob,
  });
  if (!uploadRes.ok) throw new Error(`B2 upload failed: ${uploadRes.status}`);

  return `${downloadUrl}/file/${BUCKET_NAME}/${fileName}`;
}
