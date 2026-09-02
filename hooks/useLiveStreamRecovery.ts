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

/**
 * Cuánto dura el cartel de "Reconectando…" después de un reenganche.
 *
 * No se apaga cuando el video vuelve a reproducir sino por tiempo, a propósito:
 * el remonte tarda un instante en producir el primer frame y un cartel que
 * parpadea en cada micro-recuperación es peor que uno que se queda un momento.
 */
const RECONNECTING_MS = 3500;

export interface LiveStreamRecovery {
  /** Va en la `key` del `<Video>`: al cambiar, se remonta y reengancha. */
  reloadNonce: number;
  /** Pasar a `onPlaybackStatusUpdate` del `<Video>`. */
  onPlaybackStatusUpdate: (status: AVPlaybackStatus) => void;
  /** Pasar a `onError`. Reintenta en vez de rendirse a la primera. */
  onError: () => void;
  /** Cuántas veces se reenganchó. Para diagnóstico. */
  recoveries: number;
  /** True mientras se está reenganchando: la UI muestra "Reconectando…". */
  reconnecting: boolean;
  /**
   * Reintento **manual**, desde un botón. Ignora el piso entre intentos: si la
   * persona lo pide explícitamente, hacerla esperar sin decirle por qué sería
   * peor que un remonte de más.
   */
  retryNow: () => void;
}

export function useLiveStreamRecovery(enabled: boolean): LiveStreamRecovery {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [recoveries, setRecoveries] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /** Remonta el `<Video>` y enciende el cartel de "Reconectando…". */
  const doRecover = useCallback(() => {
    lastRetryRef.current = Date.now();
    reset();
    setReloadNonce((n) => n + 1);
    setRecoveries((n) => n + 1);
    setReconnecting(true);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => setReconnecting(false), RECONNECTING_MS);
  }, [reset]);

  /** Reenganche AUTOMÁTICO: respeta el piso para no remontar en bucle. */
  const recover = useCallback(() => {
    if (Date.now() - lastRetryRef.current < MIN_RETRY_MS) return;
    doRecover();
  }, [doRecover]);

  /** Reenganche MANUAL: sin piso, lo pidió una persona. */
  const retryNow = useCallback(() => {
    doRecover();
  }, [doRecover]);

  // Un timer vivo tras desmontar deja un setState sobre un componente muerto.
  useEffect(() => () => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
  }, []);

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

  return { reloadNonce, onPlaybackStatusUpdate, onError, recoveries, reconnecting, retryNow };
}
