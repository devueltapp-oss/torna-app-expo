/**
 * Dual-handle trim slider. Reusa la lógica que pediría el spec original
 * (min 3 s, max 60 s, brand-strict warning colors) sin depender de
 * `react-native-unistyles`. Usa PanResponder de RN core — sin reanimated.
 */
import React from 'react';
import { View, Text, PanResponder, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../../theme';

export const TRIM_MIN_SEC = 3;
export const TRIM_MAX_SEC = 60;

export interface TrimRangeSliderProps {
  duration: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
}

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function TrimRangeSlider({ duration, value, onChange }: TrimRangeSliderProps) {
  const { colors } = useTheme();
  const [w, setW] = React.useState(0);

  // Refs latentes: el PanResponder se crea UNA SOLA vez, así que tiene que
  // leer la duración y el width actuales por ref (sino quedan capturados al
  // momento del montaje y nunca se actualizan).
  const valueRef = React.useRef(value);
  const widthRef = React.useRef(w);
  const durRef   = React.useRef(duration);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { valueRef.current = value; }, [value]);
  React.useEffect(() => { widthRef.current = w; }, [w]);
  React.useEffect(() => { durRef.current = duration; }, [duration]);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Valor al INICIO del drag — se fija en onPanResponderGrant y se usa como
  // base para sumar `g.dx`. Sin esto, la handle "se escapa" porque g.dx es
  // acumulativo desde el touch-start pero el value ya cambió.
  const grantValueRef = React.useRef<[number, number]>(value);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  function buildResponder(handle: 'start' | 'end') {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { grantValueRef.current = valueRef.current; },
      onPanResponderMove: (_, g) => {
        const wNow = widthRef.current;
        if (wNow <= 0) return;
        const dNow = durRef.current;
        const [s0, e0] = grantValueRef.current;
        const dt = (g.dx / wNow) * dNow;
        if (handle === 'start') {
          const next = Math.max(0, Math.min(e0 - TRIM_MIN_SEC, s0 + dt));
          onChangeRef.current([next, e0]);
        } else {
          const next = Math.min(dNow, Math.max(s0 + TRIM_MIN_SEC, e0 + dt));
          onChangeRef.current([s0, next]);
        }
      },
    });
  }

  const startPan = React.useRef(buildResponder('start')).current;
  const endPan   = React.useRef(buildResponder('end')).current;

  const [start, end] = value;
  const sel = end - start;
  const tooShort = sel < TRIM_MIN_SEC;
  const tooLong  = sel > TRIM_MAX_SEC;
  const warn = tooShort || tooLong;

  const pct = (s: number) => duration > 0 ? (s / duration) * 100 : 0;

  return (
    <View style={{ gap: 10 }}>
      <View
        onLayout={onLayout}
        style={{
          height: 56, borderRadius: 12, backgroundColor: colors.bg2,
          borderWidth: 1, borderColor: colors.line, justifyContent: 'center',
        }}>
        {/* base track */}
        <View style={{
          position: 'absolute', left: 14, right: 14, top: '50%', height: 4,
          marginTop: -2, backgroundColor: colors.lineStrong, borderRadius: 2,
        }}/>
        {/* selection */}
        <View style={{
          position: 'absolute', top: '50%', height: 8, marginTop: -4,
          left: `${pct(start)}%`, width: `${pct(end - start)}%`,
          backgroundColor: warn ? colors.lineStrong : colors.accent, borderRadius: 4,
        }}/>
        {/* handle start */}
        <View
          {...startPan.panHandlers}
          style={{
            position: 'absolute', top: '50%', marginTop: -18,
            left: `${pct(start)}%`, marginLeft: -9,
            width: 18, height: 36, borderRadius: 6,
            borderWidth: 2, borderColor: colors.ink, backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <View style={{ width: 2, height: 14, backgroundColor: colors.ink }}/>
        </View>
        {/* handle end */}
        <View
          {...endPan.panHandlers}
          style={{
            position: 'absolute', top: '50%', marginTop: -18,
            left: `${pct(end)}%`, marginLeft: -9,
            width: 18, height: 36, borderRadius: 6,
            borderWidth: 2, borderColor: colors.ink, backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <View style={{ width: 2, height: 14, backgroundColor: colors.ink }}/>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={{ fontFamily: 'Menlo', fontSize: 11, color: colors.muted2 }}>IN  {fmt(start)}</Text>
          <Text style={{ fontFamily: 'Menlo', fontSize: 11, color: colors.muted2 }}>OUT {fmt(end)}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
          {fmt(sel)} <Text style={{ color: colors.muted2, fontWeight: '600' }}>/ {TRIM_MAX_SEC}s máx</Text>
        </Text>
      </View>

      {warn ? (
        <View style={{ backgroundColor: colors.accentSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, color: colors.accentText, fontWeight: '700' }}>
            {tooShort ? `El clip debe durar al menos ${TRIM_MIN_SEC}s.` : `El clip no puede pasar de ${TRIM_MAX_SEC}s.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
