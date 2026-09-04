/**
 * InlineVideo — reproductor chico sin controles para las tiles/cards que muestran
 * un stream en vivo de fondo (Inicio, perfiles de club y de player).
 *
 * Migrado de `expo-av` a `expo-video` (SDK 55: `expo-av` se eliminó). `expo-video`
 * obliga a crear el player con el hook `useVideoPlayer`, así que cada video vive en
 * su propio componente. Los call sites siguen montando/desmontando con `key={id}`,
 * que es lo que cambia de fuente.
 *
 * NO usar para el visor grande (`GameDetailScreen`) ni el modal de highlight
 * (`VideoPreviewModal`): ésos necesitan seek, estado de reproducción y —el visor—
 * la lógica de destrabe de `useLiveStreamRecovery`.
 */
import React from 'react';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView, type VideoContentFit } from 'expo-video';

export interface InlineVideoProps {
  /** URL del stream (HLS) o del MP4. */
  uri: string;
  style?: any;
  /** Igual semántica que el viejo `ResizeMode`: COVER → 'cover', CONTAIN → 'contain'. */
  contentFit?: VideoContentFit;
  muted?: boolean;
  loop?: boolean;
  /** Se llama cuando el player entra en estado 'error' (equivalente al viejo `onError`). */
  onError?: () => void;
  /** Se llama al arrancar/parar la reproducción (equivalente a leer `status.isPlaying`). */
  onPlayingChange?: (playing: boolean) => void;
}

export function InlineVideo({
  uri,
  style,
  contentFit = 'cover',
  muted = true,
  loop = false,
  onError,
  onPlayingChange,
}: InlineVideoProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = muted;
    p.loop = loop;
    p.play();
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error' || error) onError?.();
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    onPlayingChange?.(isPlaying);
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={false}
      pointerEvents="none"
    />
  );
}
