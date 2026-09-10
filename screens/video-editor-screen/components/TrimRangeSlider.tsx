import React from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '../../../theme';

export const TRIM_MIN_SEC = 3;
export const TRIM_MAX_SEC = 180;
export const FILMSTRIP_H = 72;

export interface TrimRangeSliderProps {
  duration: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  currentTime?: number;
}

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Clamps puros de los 3 gestos del recorte, separados del `PanResponder`/
 * `Gesture.Pan()` por el mismo motivo que `shouldDismissSwipe` en
 * `useSwipeToDismiss.ts`: lo que devuelve el gesture handler (`onUpdate`) no
 * se puede simular con un evento de prueba, así que la única parte testeable
 * es la aritmética. `dt` = delta de tiempo ya convertido de píxeles a
 * segundos (`translationX / width * duration`); `s0`/`e0` = rango al
 * comenzar el gesto (`onBegin`).
 *
 * Los tres garantizan por construcción que `TRIM_MIN_SEC <= end-start <=
 * TRIM_MAX_SEC` — antes solo el mínimo estaba clampeado acá, y el máximo se
 * descubría después con un cartel de error ("El clip no puede pasar de
 * 3:00") que había que resolver soltando el handle y volviendo a arrastrar.
 */
export function clampStartDrag(dt: number, s0: number, e0: number): number {
  const minStart = Math.max(0, e0 - TRIM_MAX_SEC);
  const maxStart = e0 - TRIM_MIN_SEC;
  return Math.max(minStart, Math.min(maxStart, s0 + dt));
}

export function clampEndDrag(dt: number, s0: number, e0: number, duration: number): number {
  const maxEnd = Math.min(duration, s0 + TRIM_MAX_SEC);
  const minEnd = s0 + TRIM_MIN_SEC;
  return Math.max(minEnd, Math.min(maxEnd, e0 + dt));
}

/** Arrastre del cuadro entero: mismo `dt` aplicado a los dos extremos, sin
 * cambiar la duración seleccionada — devuelve el nuevo `start` únicamente
 * (`end` = `start + (e0 - s0)`, calculado por el caller). */
export function clampMoveDrag(dt: number, s0: number, e0: number, duration: number): number {
  const segLen = e0 - s0;
  return Math.max(0, Math.min(duration - segLen, s0 + dt));
}

export function TrimRangeSlider({ duration, value, onChange, currentTime }: TrimRangeSliderProps) {
  const { colors } = useTheme();
  const [w, setW] = React.useState(0);

  const valueRef = React.useRef(value);
  const widthRef = React.useRef(w);
  const durRef   = React.useRef(duration);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { valueRef.current = value; }, [value]);
  React.useEffect(() => { widthRef.current = w; }, [w]);
  React.useEffect(() => { durRef.current = duration; }, [duration]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const grantValueRef = React.useRef<[number, number]>(value);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const startGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        // Área táctil amplia + agarre inmediato: el handle visible es angosto
        // (12px), así que sin esto cuesta agarrarlo y arrastrarlo.
        .hitSlop({ left: 16, right: 16 })
        .minDistance(0)
        .activeOffsetX([-2, 2])
        .onBegin(() => { grantValueRef.current = valueRef.current; })
        .onUpdate((e) => {
          const wNow = widthRef.current;
          if (wNow <= 0) return;
          const dNow = durRef.current;
          const [s0, e0] = grantValueRef.current;
          const dt = (e.translationX / wNow) * dNow;
          onChangeRef.current([clampStartDrag(dt, s0, e0), e0]);
        }),
    [],
  );

  const endGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .hitSlop({ left: 16, right: 16 })
        .minDistance(0)
        .activeOffsetX([-2, 2])
        .onBegin(() => { grantValueRef.current = valueRef.current; })
        .onUpdate((e) => {
          const wNow = widthRef.current;
          if (wNow <= 0) return;
          const dNow = durRef.current;
          const [s0, e0] = grantValueRef.current;
          const dt = (e.translationX / wNow) * dNow;
          onChangeRef.current([s0, clampEndDrag(dt, s0, e0, dNow)]);
        }),
    [],
  );

  /**
   * Arrastrar TODO el recorte de una — tocando la franja de arriba del cuadro
   * de selección, no un handle — desplaza `start` y `end` juntos, la misma
   * distancia, preservando la duración elegida (2026-09-10). Antes solo se
   * podía mover un extremo por vez: para correr el fragmento 5s a la derecha
   * sin cambiar su largo había que arrastrar los dos handles a mano,
   * intentando no alterar la duración en el camino.
   */
  const moveGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .activeOffsetX([-2, 2])
        .onBegin(() => { grantValueRef.current = valueRef.current; })
        .onUpdate((e) => {
          const wNow = widthRef.current;
          if (wNow <= 0) return;
          const dNow = durRef.current;
          const [s0, e0] = grantValueRef.current;
          const dt = (e.translationX / wNow) * dNow;
          const nextStart = clampMoveDrag(dt, s0, e0, dNow);
          onChangeRef.current([nextStart, nextStart + (e0 - s0)]);
        }),
    [],
  );

  const [start, end] = value;
  const sel = end - start;
  const tooShort = sel < TRIM_MIN_SEC;
  const tooLong  = sel > TRIM_MAX_SEC;
  const warn = tooShort || tooLong;

  const pct = (s: number) => duration > 0 ? (s / duration) * 100 : 0;
  const accentColor = warn ? colors.lineStrong : colors.accent;

  return (
    <View style={{ gap: 8 }}>
      {/* Overlay sobre la filmstrip */}
      <View onLayout={onLayout} style={{ height: FILMSTRIP_H, position: 'relative' }}>

        {/* Dimming zona izquierda (antes del start) */}
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pct(start)}%`,
          backgroundColor: 'rgba(0,0,0,0.58)',
        }} pointerEvents="none" />

        {/* Dimming zona derecha (después del end) */}
        <View style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: `${100 - pct(end)}%`,
          backgroundColor: 'rgba(0,0,0,0.58)',
        }} pointerEvents="none" />

        {/* Borde superior de selección */}
        <View style={{
          position: 'absolute', top: 0, height: 3,
          left: `${pct(start)}%`, right: `${100 - pct(end)}%`,
          backgroundColor: accentColor,
        }} pointerEvents="none" />

        {/* Franja táctil para arrastrar TODO el recorte (2026-09-10). Va ANTES
            que los handles en el JSX a propósito: en las esquinas se superpone
            con su zona de 36px, y como los handles se pintan después quedan
            arriba en la prioridad de toque — tocar cerca de un extremo sigue
            resolviendo/achicando ese extremo, no moviendo el cuadro entero.
            Insets de 18px (mitad del ancho de un handle) para no competir con
            ellos en el resto del rango. */}
        <GestureDetector gesture={moveGesture}>
          <View style={{
            position: 'absolute', top: 0, height: 22,
            left: `${pct(start)}%`, right: `${100 - pct(end)}%`,
            marginLeft: 18, marginRight: 18,
          }} />
        </GestureDetector>

        {/* Borde inferior de selección */}
        <View style={{
          position: 'absolute', bottom: 0, height: 3,
          left: `${pct(start)}%`, right: `${100 - pct(end)}%`,
          backgroundColor: accentColor,
        }} pointerEvents="none" />

        {/* Playhead */}
        {currentTime != null && duration > 0 && (
          <View style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${pct(currentTime)}%`,
            width: 2, backgroundColor: '#FFFFFF', opacity: 0.9,
          }} pointerEvents="none" />
        )}

        {/* Handle izquierdo — target táctil ancho (36px) con barra visible 12px */}
        <GestureDetector gesture={startGesture}>
          <View style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${pct(start)}%`, marginLeft: -18,
            width: 36, alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              alignSelf: 'stretch', flex: 1,
              backgroundColor: accentColor,
              marginHorizontal: 12,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{ gap: 3 }}>
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
              </View>
            </View>
          </View>
        </GestureDetector>

        {/* Handle derecho — target táctil ancho (36px) con barra visible 12px */}
        <GestureDetector gesture={endGesture}>
          <View style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${pct(end)}%`, marginLeft: -18,
            width: 36, alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              alignSelf: 'stretch', flex: 1,
              backgroundColor: accentColor,
              marginHorizontal: 12,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{ gap: 3 }}>
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
                <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
              </View>
            </View>
          </View>
        </GestureDetector>
      </View>

      {/* Labels IN / OUT y duración */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 2 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={{ fontFamily: 'Menlo', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>IN  {fmt(start)}</Text>
          <Text style={{ fontFamily: 'Menlo', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>OUT {fmt(end)}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '800', color: warn ? accentColor : '#FFFFFF' }}>
          {fmt(sel)}{' '}
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>/ {fmt(TRIM_MAX_SEC)} máx</Text>
        </Text>
      </View>

      {warn ? (
        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, color: accentColor, fontWeight: '700' }}>
            {tooShort ? `El clip debe durar al menos ${TRIM_MIN_SEC}s.` : `El clip no puede pasar de ${fmt(TRIM_MAX_SEC)}.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
