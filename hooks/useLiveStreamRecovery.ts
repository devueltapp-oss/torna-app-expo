/**
 * useLiveStreamRecovery — detecta que una transmisión EN VIVO se trabó y la
 * reengancha sola.
 *
 * ## El problema
 *
 * `expo-av` avisa por `onError` cuando algo **falla**, pero un HLS en vivo casi
 * nunca falla: **se traba**. Un microcorte de red deja al reproductor atrás de la
 * ventana en vivo; los segmentos que pide ya se borraron del servidor, así que se
 * queda esperando indefinidamente. La imagen queda congelada, `onError` **no**
 * dispara, y sin `onPlaybackStatusUpdate` nadie se entera.
 *
 * Por eso la misma URL anda en un tester web y no en la app: **hls.js recupera
 * solo** —recarga la playlist y salta al borde en vivo—, y ExoPlayer/AVPlayer no.
 *
 * ## La estrategia: remontar, no "reanudar"
 *
 * La recuperación es cambiar la `key` del `<Video>` para que React lo **remonte**
 * con una instancia nueva, que vuelve a pedir la playlist y entra por el borde en
 * vivo. Es más brusco que `unloadAsync`/`loadAsync`, pero es lo único
 * confiable: llamar `playAsync()` sobre un reproductor que quedó apuntando a
 * segmentos inexistentes no lo desatasca, y encadenar unload/load tiene carreras
 * con el status que llega en el medio.
 *
 * ⚠️ **Solo para vivos.** En un video grabado, la posición detenida significa
 * "pausado" o "terminado", no "trabado": aplicar esto lo reiniciaría en bucle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AVPlaybackStatus } from 'expo-av';

/**
 * Reproduciendo pero sin avanzar un solo milisegundo por este tiempo = trabado.
 * Más corto y un hipo normal de red dispararía un remonte innecesario.
 */
const FROZEN_MS = 6000;

/**
 * Buffereando sin parar por este tiempo = trabado. Va más alto que `FROZEN_MS`
 * porque bufferear es una fase legítima al arrancar o al cambiar de cámara.
 */
const BUFFERING_MS = 12000;

/** Piso entre dos intentos: sin esto, un stream caído remonta en bucle cerrado. */
const MIN_RETRY_MS = 4000;

export interface LiveStreamRecovery {
  /** Va en la `key` del `<Video>`: al cambiar, se remonta y reengancha. */
  reloadNonce: number;
  /** Pasar a `onPlaybackStatusUpdate` del `<Video>`. */
  onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void;
  /** Pasar a `onError`. Reintenta en vez de rendirse a la primera. */
  onError: () => void;
  /** Cuántas veces se reenganchó. Para diagnóstico. */
  recoveries: number;
}

export function useLiveStreamRecovery(enabled: boolean): LiveStreamRecovery {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [recoveries, setRecoveries] = useState(0);

  // Refs y no estado: se escriben en cada status (varias veces por segundo) y
  // no deben provocar un render.
  const lastPositionRef = useRef(-1);
  const positionSinceRef = useRef(Date.now());
  const bufferingSinceRef = useRef<number | null>(null);
  const lastRetryRef = useRef(0);

  const reset = useCallback(() => {
    lastPositionRef.current = -1;
    positionSinceRef.current = Date.now();
    bufferingSinceRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  const recover = useCallback(() => {
    const now = Date.now();
    if (now - lastRetryRef.current < MIN_RETRY_MS) return;
    lastRetryRef.current = now;
    reset();
    setReloadNonce((n) => n + 1);
    setRecoveries((n) => n + 1);
  }, [reset]);

  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!enabled) return;

      if (!status.isLoaded) {
        // `error` acá es un fallo de carga: el `onError` del componente ya lo
        // maneja, no hace falta duplicar el reintento.
        return;
      }

      const now = Date.now();

      // (a) Buffereando demasiado tiempo seguido.
      if (status.isBuffering) {
        bufferingSinceRef.current ??= now;
        if (now - bufferingSinceRef.current > BUFFERING_MS) recover();
      } else {
        bufferingSinceRef.current = null;
      }

      // (b) Dice que reproduce, pero la posición no se mueve.
      //
      // ⚠️ El chequeo va contra `isPlaying`, no contra `shouldPlay`: si el
      // usuario pausó a propósito, la posición detenida es lo correcto y
      // remontar le arrancaría el video solo.
      if (status.isPlaying) {
        const pos = status.positionMillis ?? 0;
        if (pos !== lastPositionRef.current) {
          lastPositionRef.current = pos;
          positionSinceRef.current = now;
        } else if (now - positionSinceRef.current > FROZEN_MS) {
          recover();
        }
      } else {
        positionSinceRef.current = now;
      }
    },
    [enabled, recover],
  );

  const onError = useCallback(() => {
    if (enabled) recover();
  }, [enabled, recover]);

  return { reloadNonce, onPlaybackStatusUpdate, onError, recoveries };
}
