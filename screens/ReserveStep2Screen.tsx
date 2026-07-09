import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button, AppHeader } from '../components/ui';
import type { Slot, ClubCourtPublic } from '../data/types';
import { StepIndicator } from './reserveCommon';

export interface DayOption { label: string; date: string; dow: string; iso?: string }

interface Props {
  court: ClubCourtPublic;
  slots: Slot[];
  /** Optional pre-built day strip. If absent, a 6-day default starting "Hoy". */
  days?: DayOption[];
  onBack?: () => void;
  onChangeCourt?: () => void;
  /** Llamado al cambiar de día — el contenedor refetchea los slots de ese día. */
  onDayChange?: (day: DayOption) => void;
  onContinue?: (slot: Slot, day: DayOption) => void;
}

const DEFAULT_DAYS: DayOption[] = [
  { label: 'Hoy',    date: '12', dow: 'MAR' },
  { label: 'Mañana', date: '13', dow: 'MIE' },
  { label: 'Jue',    date: '14', dow: 'JUE' },
  { label: 'Vie',    date: '15', dow: 'VIE' },
  { label: 'Sáb',    date: '16', dow: 'SAB' },
  { label: 'Dom',    date: '17', dow: 'DOM' },
];

/**
 * Step 2 of 3 — pick day + time slot.
 *
 * In production:
 *   GET /courts/:id/slots?date=YYYY-MM-DD → Slot[]
 */
export function ReserveStep2Screen({
  court, slots, days = DEFAULT_DAYS, onBack, onChangeCourt, onDayChange, onContinue,
}: Props) {
  const { colors } = useTheme();
  const MAX_BLOCKS = 4;
  const [dayIdx, setDayIdx] = React.useState(0);
  const [pickedIdx, setPickedIdx] = React.useState(0);
  const [blocks, setBlocks] = React.useState(1);
  // Al cambiar los slots (nuevo día), seleccionar el primer slot libre.
  React.useEffect(() => {
    const i = slots.findIndex((s) => s.status === 'free');
    setPickedIdx(i >= 0 ? i : 0);
    setBlocks(1);
  }, [slots]);
  const picked = slots[pickedIdx];

  // Cantidad de bloques libres consecutivos desde el slot elegido (tope 4).
  const maxBlocks = React.useMemo(() => {
    let n = 0;
    for (let i = pickedIdx; i < slots.length && n < MAX_BLOCKS; i++) {
      if (slots[i]?.status !== 'free') break;
      n++;
    }
    return Math.max(1, n);
  }, [slots, pickedIdx]);

  // Si cambia el máximo (nuevo slot), acotar la selección.
  React.useEffect(() => {
    setBlocks((b) => Math.min(b, maxBlocks));
  }, [maxBlocks]);

  // Slot combinado (varios bloques): mismo inicio, fin del último bloque,
  // duración y precio × N. Es lo que se envía a la reserva.
  const combined: Slot | undefined = React.useMemo(() => {
    if (!picked) return undefined;
    const last = slots[pickedIdx + blocks - 1] ?? picked;
    return {
      ...picked,
      end: last.end,
      duration: picked.duration * blocks,
      price: picked.price * blocks,
    };
  }, [picked, slots, pickedIdx, blocks]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Fecha y horario"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        right={<Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700' }}>2/3</Text>}
      />
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <StepIndicator step={2}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Selected court summary */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
        }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>CANCHA</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{court.name} · {court.surface}</Text>
            {court.active === false && (
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, marginTop: 2 }}>
                Cancha inactiva · sin horarios disponibles
              </Text>
            )}
          </View>
          <Pressable onPress={onChangeCourt}>
            <Text style={{ fontSize: 11, color: colors.accentText, fontWeight: '700', textDecorationLine: 'underline' }}>Cambiar</Text>
          </Pressable>
        </View>

        {/* Day picker */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Día</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            style={{ marginHorizontal: -16, paddingLeft: 16 }}>
            {days.map((d, i) => {
              const on = i === dayIdx;
              return (
                <Pressable key={i} onPress={() => { setDayIdx(i); onDayChange?.(d); }}
                  style={{
                    width: 56, paddingVertical: 8, borderRadius: 12, alignItems: 'center', gap: 2,
                    backgroundColor: on ? colors.primary : colors.surface,
                    borderWidth: on ? 0 : 1, borderColor: colors.line,
                  }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: on ? colors.primaryFg : colors.muted2 }}>{d.dow}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: on ? colors.primaryFg : colors.text }}>{d.date}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Slot grid */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Horario</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Legend swatch={colors.surface} border={colors.line} label="Libre"/>
              <Legend swatch={colors.bg3}    label="Reservado"/>
              <Legend swatch={colors.accent} label="Tuya"/>
            </View>
          </View>
          {slots.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted2, paddingVertical: 12 }}>
              No hay horarios disponibles para este día.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((s, i) => <SlotChip key={i} slot={s} selected={i === pickedIdx} onPress={() => { setPickedIdx(i); setBlocks(1); }}/>)}
            </View>
          )}
        </View>

        {/* Duración: cantidad de bloques consecutivos (1–4) */}
        {slots.length > 0 && picked?.status === 'free' && (
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Duración</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Array.from({ length: MAX_BLOCKS }, (_, i) => i + 1).map((n) => {
                const disabled = n > maxBlocks;
                const on = n === blocks;
                return (
                  <Pressable key={n} disabled={disabled} onPress={() => setBlocks(n)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
                      backgroundColor: on ? colors.primary : colors.surface,
                      borderWidth: on ? 0 : 1, borderColor: colors.line,
                      opacity: disabled ? 0.4 : 1,
                    }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: on ? colors.primaryFg : colors.text }}>
                      {n === 1 ? '1 bloque' : `${n} bloques`}
                    </Text>
                    {picked && (
                      <Text style={{ fontSize: 10, fontWeight: '700', color: on ? colors.primaryFg : colors.muted2, marginTop: 2 }}>
                        {picked.duration * n} min
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.muted2, fontWeight: '700' }}>
            Total estimado{blocks > 1 ? ` · ${blocks} bloques` : ''}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            {combined ? `$${combined.price.toLocaleString('es-AR')}` : '—'}
          </Text>
        </View>
        <Button fullWidth size="lg"
          variant={!combined || combined.status === 'reserved' ? 'disabled' : 'primary'}
          onPress={() => combined && onContinue?.(combined, days[dayIdx])}>Continuar →</Button>
      </View>
    </SafeAreaView>
  );
}

function Legend({ swatch, border, label }: { swatch: string; border?: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{
        width: 8, height: 8, borderRadius: 2,
        backgroundColor: swatch,
        borderWidth: border ? 1 : 0, borderColor: border,
      }}/>
      <Text style={{ fontSize: 10, color: colors.muted2, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function SlotChip({ slot, selected, onPress }: { slot: Slot; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const disabled = slot.status === 'reserved';
  // Per status visual treatment (brand-strict: lime + blue only).
  const conf =
    slot.status === 'own' ? { bg: colors.okBg, fg: colors.okFg, border: colors.accent, priceFg: colors.okFg } :
    slot.status === 'reserved' ? { bg: colors.bg3, fg: colors.muted, border: colors.line, priceFg: colors.muted } :
    { bg: colors.surface, fg: colors.text, border: colors.line, priceFg: colors.accentText };

  const bg = selected ? colors.primary : conf.bg;
  const fg = selected ? colors.primaryFg : conf.fg;
  const priceFg = selected ? colors.primaryFg : conf.priceFg;
  const camColor = selected ? colors.primaryFg : colors.muted2;

  return (
    <Pressable disabled={disabled} onPress={onPress}
      style={{
        width: '48%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: bg,
        borderWidth: selected ? 0 : 1.5, borderColor: conf.border,
        opacity: disabled ? 0.65 : 1,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: fg }}>{slot.start} – {slot.end}</Text>
        {slot.cams && <Camera size={12} color={camColor}/>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: fg, opacity: 0.75, letterSpacing: 0.3 }}>{slot.duration} MIN</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: priceFg }}>${slot.price.toLocaleString('es-AR')}</Text>
      </View>
    </Pressable>
  );
}
