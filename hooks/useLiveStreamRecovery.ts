/**
 * useLiveStreamRecovery — detecta que una transmisión EN VIVO se trabó y la
 * reengancha sola.
 *
 * ## El problema
 *
 * Un HLS en vivo casi nunca "falla": **se traba**. Un microcorte de red deja al
 * reproductor atrás de la ventana en vivo; los segmentos que pide ya se borraron
 * del servidor, así que se queda esperando indefinidamente. La imagen queda
 * congelada y el player **no emite ningún error** — su estado sigue diciendo
 * `readyToPlay` y `playing`.
 *
 * Por eso la misma URL anda en un tester web y no en la app: **hls.js recupera
 * solo** —recarga la playlist y salta al borde en vivo—, y ExoPlayer/AVPlayer no.
 *
 * ## La estrategia: volver a cargar la fuente, no "reanudar"
 *
 * La recuperación es bumpear `reloadNonce`; el consumidor reacciona llamando
 * `player.replace(streamUrl)` (o remontando el `<VideoView>`), lo que hace que el
 * player vuelva a pedir la playlist y entre por el borde en vivo. Llamar `play()`
 * sobre un player que quedó apuntando a segmentos inexistentes no lo desatasca.
 *
 * ## Cómo detecta (expo-video, SDK 55)
 *
 * `expo-video` no tiene un callback de status continuo como el viejo
 * `onPlaybackStatusUpdate` de `expo-av`. En su lugar el hook corre su **propio
 * sampler** cada segundo mientras la partida está en vivo y lee del `player`:
 *  · `player.currentTime` no avanza mientras `player.playing` → congelado
 *  · `player.status === 'loading'` sostenido → buffering eterno
 *  · `statusChange` con `status === 'error'` → error de carga
 *
 * ⚠️ **Solo para vivos.** En un video grabado, la posición detenida significa
 * "pausado" o "terminado", no "trabado": aplicar esto lo reiniciaría en bucle.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoPlayer } from 'expo-video';

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
 * recuperación por buena y limpiar el contador de reintentos. Ver la nota en el
 * sampler.
 */
const STABLE_MS = 8000;

/** Cada cuánto el sampler lee el estado del player. */
const SAMPLE_MS = 1000;

export interface LiveStreamRecovery {
  /**
   * Cambia cada vez que hay que reenganchar. El consumidor lo mira para llamar
   * `player.replace(streamUrl)` (o para ponerlo en la `key` del `<VideoView>`).
   */
  reloadNonce: number;
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
 * @param player  Instancia de `expo-video` a vigilar. `null` mientras no hay una.
 * @param enabled Solo `true` en partidas EN VIVO.
 * @param hold    Mientras sea `true`, **no se reengancha**. Ver abajo.
 *
 * ⚠️ **`hold` existe por el teclado.** Volver a cargar la fuente puede recrear el
 * `SurfaceView` y Android le da el foco de ventana, lo que **cierra el teclado**:
 * si el reenganche caía justo mientras alguien escribía un comentario, le cortaba
 * la escritura a mitad. Un comentario dura pocos segundos y el reenganche puede
 * esperar; al revés no.
 *
 * La detección **sigue corriendo** durante el hold: solo se posterga el
 * reenganche, así que apenas se suelta el foco reengancha en el siguiente ciclo.
 */
export function useLiveStreamRecovery(
  player: VideoPlayer | null,
  enabled: boolean,
  hold = false,
): LiveStreamRecovery {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [recoveries, setRecoveries] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const [stalled, setStalled] = useState(false);
  /** Reintentos automáticos consecutivos. Se resetea al recuperar de verdad. */
  const autoRetriesRef = useRef(0);
  // Espejo de `stalled` para poder leerlo dentro del sampler sin meterlo en sus
  // dependencias.
  const stalledRef = useRef(false);
  // `hold` en un ref: lo lee `recover`, que se memoiza y no debe recrearse cada
  // vez que el composer gana o pierde el foco.
  const holdRef = useRef(hold);
  useEffect(() => { holdRef.current = hold; }, [hold]);

  // Refs y no estado: se escriben en cada sample y no deben provocar un render.
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
   * Bumpea `reloadNonce` (el consumidor recarga la fuente) y enciende el cartel
   * de "Reconectando…".
   *
   * ⚠️ El cartel **no se apaga por tiempo**: queda encendido hasta que el video
   * vuelve de verdad o hasta que se agota el último reintento.
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
    // Escribiendo: se posterga el reenganche para no cerrarle el teclado.
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

  // Sampler: cada segundo lee el estado del player y decide si reenganchar.
  useEffect(() => {
    if (!enabled || !player) { reset(); return undefined; }

    const id = setInterval(() => {
      let status: string;
      let playing: boolean;
      let currentTime: number;
      try {
        status = player.status;
        playing = player.playing;
        currentTime = player.currentTime;
      } catch {
        // El player se liberó entre el tick y acá.
        return;
      }

      const now = Date.now();

      // (a) Buffering sostenido.
      if (status === 'loading') {
        bufferingSinceRef.current ??= now;
        if (now - bufferingSinceRef.current > BUFFERING_MS) recover();
      } else {
        bufferingSinceRef.current = null;
      }

      // (b) Dice que reproduce, pero la posición no se mueve.
      //
      // ⚠️ Va contra `player.playing`, no contra un "shouldPlay": si el usuario
      // pausó a propósito, la posición detenida es lo correcto y reenganchar le
      // arrancaría el video solo.
      if (playing) {
        const pos = Math.round(currentTime * 1000);
        if (pos !== lastPositionRef.current) {
          /*
           * Se limpia el contador de reintentos solo si el video lleva
           * `STABLE_MS` reproduciendo desde el último remonte.
           *
           * ⚠️ **No alcanza con "la posición cambió".** Tras un remonte,
           * `reset()` deja `lastPosition` en -1, así que el PRIMER sample —aunque
           * traiga la misma posición congelada de antes— se ve como un avance. Sin
           * la ventana de estabilidad, cada remonte se auto-declaraba exitoso, el
           * contador nunca llegaba al tope y `stalled` no se activaba jamás con un
           * stream realmente caído: el botón de recarga no habría aparecido nunca.
           */
          if (now - lastRetryRef.current > STABLE_MS) {
            if (autoRetriesRef.current !== 0) autoRetriesRef.current = 0;
            if (stalledRef.current) { stalledRef.current = false; setStalled(false); }
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
    }, SAMPLE_MS);

    return () => clearInterval(id);
  }, [enabled, player, recover, reset]);

  // Error de carga del player: reintenta remontando en vez de rendirse.
  useEffect(() => {
    if (!enabled || !player) return undefined;
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') recover();
    });
    return () => sub.remove();
  }, [enabled, player, recover]);

  return { reloadNonce, recoveries, reconnecting, stalled, retryNow };
}
