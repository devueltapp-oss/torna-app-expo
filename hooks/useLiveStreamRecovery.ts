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
 * Reintentos automáticos seguidos antes de rendirse y mostrar el botón de
 * recarga. Tres da ~15 s de intentos: suficiente para un microcorte de red, y
 * poco para dejar a alguien mirando un spinner eterno cuando la transmisión ya
 * terminó.
 */
const MAX_AUTO_RETRIES = 3;

/**
 * Cuánto tiene que llevar reproduciendo desde el último remonte para dar la
 * recuperación por buena y limpiar el contador de reintentos. Ver la nota en
 * `onPlaybackStatusUpdate`.
 */
const STABLE_MS = 8000;

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
   * El reenganche automático se rindió: varios intentos seguidos sin que el
   * video vuelva. La UI muestra el botón de recarga al centro.
   *
   * Existe porque reintentar para siempre en silencio es peor que decir "se
   * cortó": si la transmisión terminó de verdad, la app quedaría con una imagen
   * congelada y un spinner eterno, sin que el usuario sepa que ya no hay nada
   * del otro lado.
   */
  stalled: boolean;
  /**
   * Reintento **manual**, desde un botón. Ignora el piso entre intentos: si la
   * persona lo pide explícitamente, hacerla esperar sin decirle por qué sería
   * peor que un remonte de más.
   */
  retryNow: () => void;
}

/**
 * @param enabled Solo `true` en partidas EN VIVO.
 * @param hold    Mientras sea `true`, **no se remonta el video**. Ver abajo.
 *
 * ⚠️ **`hold` existe por el teclado.** Remontar el `<Video>` crea un
 * `SurfaceView` nuevo y Android le da el foco de ventana, lo que **cierra el
 * teclado**: si el reenganche caía justo mientras alguien escribía un
 * comentario, le cortaba la escritura a mitad. Un comentario dura pocos
 * segundos y el reenganche puede esperar; al revés no — perder lo que estabas
 * tipeando es peor que ver la imagen trabada un rato más.
 *
 * La detección **sigue corriendo** durante el hold: solo se posterga el
 * remonte, así que apenas se suelta el foco reengancha en el siguiente ciclo.
 */
export function useLiveStreamRecovery(enabled: boolean, hold = false): LiveStreamRecovery {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [recoveries, setRecoveries] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const [stalled, setStalled] = useState(false);
  /** Reintentos automáticos consecutivos. Se resetea al recuperar de verdad. */
  const autoRetriesRef = useRef(0);
  // Espejo de `stalled` para poder leerlo dentro del handler de status sin
  // meterlo en sus dependencias (se llama varias veces por segundo).
  const stalledRef = useRef(false);
  // `hold` en un ref: lo lee `recover`, que se memoiza y no debe recrearse cada
  // vez que el composer gana o pierde el foco.
  const holdRef = useRef(hold);
  useEffect(() => { holdRef.current = hold; }, [hold]);

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

  /**
   * Remonta el `<Video>` y enciende el cartel de "Reconectando…".
   *
   * ⚠️ El cartel **no se apaga por tiempo**: queda encendido hasta que el video
   * vuelve de verdad o hasta que se agota el último reintento. Antes duraba 3,5 s
   * por intento, así que entre un intento y el siguiente la pantalla se quedaba
   * congelada **sin ninguna señal** — parecía colgada. Ahora la secuencia se lee
   * entera: spinner mientras se intenta, y recién al rendirse el botón de
   * recargar.
   */
  const doRecover = useCallback(() => {
    lastRetryRef.current = Date.now();
    reset();
    setReloadNonce((n) => n + 1);
    setRecoveries((n) => n + 1);
    setReconnecting(true);
  }, [reset]);

  /**
   * Reenganche AUTOMÁTICO: respeta el piso y **se rinde** tras
   * `MAX_AUTO_RETRIES`. Rendirse es la feature: deja de reintentar en silencio y
   * le da al usuario el botón de recarga con una explicación.
   */
  const recover = useCallback(() => {
    // Escribiendo: se posterga el remonte para no cerrarle el teclado. Ver la
    // nota de `hold` en la firma del hook.
    if (holdRef.current) return;
    if (Date.now() - lastRetryRef.current < MIN_RETRY_MS) return;
    if (autoRetriesRef.current >= MAX_AUTO_RETRIES) {
      stalledRef.current = true;
      setStalled(true);
      // Se apaga el spinner: ya no se está intentando, ahora la pelota la tiene
      // el usuario (botón de recargar).
      setReconnecting(false);
      return;
    }
    autoRetriesRef.current += 1;
    doRecover();
  }, [doRecover]);

  /**
   * Reenganche MANUAL: sin piso y **resetea el contador**, lo pidió una persona.
   * Si vuelve a fallar, el automático se rinde otra vez y el botón reaparece.
   */
  const retryNow = useCallback(() => {
    autoRetriesRef.current = 0;
    stalledRef.current = false;
    setStalled(false);
    doRecover();
  }, [doRecover]);

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
          /*
           * Se limpia el contador de reintentos solo si el video lleva
           * `STABLE_MS` reproduciendo desde el último remonte.
           *
           * ⚠️ **No alcanza con "la posición cambió".** Tras un remonte,
           * `reset()` deja `lastPosition` en -1, así que el PRIMER status —aunque
           * traiga la misma posición congelada de antes— se ve como un avance. Sin
           * la ventana de estabilidad, cada remonte se auto-declaraba exitoso, el
           * contador nunca llegaba al tope y `stalled` no se activaba jamás con un
           * stream realmente caído: el botón de recarga no habría aparecido nunca.
           *
           * Con la ventana, un microcorte del que sí se vuelve resetea el
           * contador (para que tres a lo largo de un partido no acaben mostrando
           * el botón con el video andando perfecto) y una traba real no.
           */
          if (now - lastRetryRef.current > STABLE_MS) {
            if (autoRetriesRef.current !== 0) autoRetriesRef.current = 0;
            if (stalledRef.current) { stalledRef.current = false; setStalled(false); }
            // Volvió de verdad: se apaga el "Reconectando…".
            setReconnecting((v) => (v ? false : v));
          }
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

  return { reloadNonce, onPlaybackStatusUpdate, onError, recoveries, reconnecting, stalled, retryNow };
}
