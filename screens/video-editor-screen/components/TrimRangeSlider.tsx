import React from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useTheme } from '../../../theme';

export const TRIM_MIN_SEC = 3;
export const TRIM_MAX_SEC = 60;
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
        .onBegin(() => { grantValueRef.current = valueRef.current; })
        .onUpdate((e) => {
          const wNow = widthRef.current;
          if (wNow <= 0) return;
          const dNow = durRef.current;
          const [s0, e0] = grantValueRef.current;
          const dt = (e.translationX / wNow) * dNow;
          const next = Math.max(0, Math.min(e0 - TRIM_MIN_SEC, s0 + dt));
          onChangeRef.current([next, e0]);
        }),
    [],
  );

  const endGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin(() => { grantValueRef.current = valueRef.current; })
        .onUpdate((e) => {
          const wNow = widthRef.current;
          if (wNow <= 0) return;
          const dNow = durRef.current;
          const [s0, e0] = grantValueRef.current;
          const dt = (e.translationX / wNow) * dNow;
          const next = Math.min(dNow, Math.max(s0 + TRIM_MIN_SEC, e0 + dt));
          onChangeRef.current([s0, next]);
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

        {/* Handle izquierdo */}
        <GestureDetector gesture={startGesture}>
          <View style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${pct(start)}%`, marginLeft: -6,
            width: 12, backgroundColor: accentColor,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ gap: 3 }}>
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
            </View>
          </View>
        </GestureDetector>

        {/* Handle derecho */}
        <GestureDetector gesture={endGesture}>
          <View style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${pct(end)}%`, marginLeft: -6,
            width: 12, backgroundColor: accentColor,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{ gap: 3 }}>
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
              <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: colors.ink }} />
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
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>/ {TRIM_MAX_SEC}s máx</Text>
        </Text>
      </View>

      {warn ? (
        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, color: accentColor, fontWeight: '700' }}>
            {tooShort ? `El clip debe durar al menos ${TRIM_MIN_SEC}s.` : `El clip no puede pasar de ${TRIM_MAX_SEC}s.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
