/**
 * Mock highlight creation API. Mirrors the prompt-spec signature:
 *
 *   createHighlightApi(token, { gameId, recordingUrl, start, end, title? })
 *     → { id, gameId, title, durationSec, publicUrl, createdAt }
 *
 * Persists in-memory so screens can list "my highlights" after the result
 * step. Replace with a real `POST /highlights` when the backend ships.
 */

export interface CreateHighlightInput {
  gameId: string;
  recordingUrl: string;
  start: number;
  end: number;
  title?: string;
}

export interface HighlightRecord {
  id: string;
  gameId: string;
  title: string;
  durationSec: number;
  publicUrl: string;
  createdAt: string;
}

const SAVED: HighlightRecord[] = [];

export async function createHighlightApi(
  _token: string,
  input: CreateHighlightInput,
): Promise<HighlightRecord> {
  await new Promise(r => setTimeout(r, 320));
  const rec: HighlightRecord = {
    id: 'hl_' + Math.random().toString(36).slice(2, 10),
    gameId: input.gameId,
    title: input.title?.trim() || 'Highlight sin título',
    durationSec: Math.round(input.end - input.start),
    publicUrl: `https://cdn.torna.io/highlights/${input.gameId}.mp4`,
    createdAt: new Date().toISOString(),
  };
  SAVED.unshift(rec);
  return rec;
}

export function listSavedHighlights(): HighlightRecord[] {
  return SAVED.slice();
}
