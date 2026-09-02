import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Camera, Check } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button, AppHeader } from '../components/ui';
import { MapsButton } from '../components/MapsButton';
import type { Slot, ClubCourtPublic } from '../data/types';
import { StepIndicator } from './reserveCommon';
import {
  MAX_BLOCKS, groupSlotsIntoBlocks, blockAvailability, isBookable,
  maxConsecutiveFreeBlocks, combineSlots,
  type CourtSlots, type TimeBlock,
} from '../lib/reservation';

export interface DayOption { label: string; date: string; dow: string; iso?: string }

/** Lo que se lleva el paso siguiente: cancha + bloque(s) elegidos + día. */
export interface BlockSelection {
  court: ClubCourtPublic;
  /** Slot combinado (1–4 bloques): inicio del primero, fin del último, duración/precio × N. */
  slot: Slot;
  day: DayOption;
  blocks: number;
}

interface Props {
  clubName: string;
  /** Ubicación del club para el botón de Maps. */
  latitude?: number | null;
  longitude?: number | null;
  /** Slots del día por cancha (una entrada por cancha activa del club). */
  courtSlots: CourtSlots<ClubCourtPublic>[];
  loading?: boolean;
  /** Tira de días. Si falta, no se muestra (el contenedor arma los 6 próximos). */
  days?: DayOption[];
  /** Cancha preseleccionada en el filtro (CTA "Reservar" de una cancha del club). */
  initialCourtId?: string;
  onBack?: () => void;
  /** Cambio de día — el contenedor refetchea los slots de todas las canchas. */
  onDayChange?: (day: DayOption) => void;
  onContinue?: (selection: BlockSelection) => void;
}

/**
 * Paso 1 de 2 — **elegir un bloque libre**. Espeja la pantalla de Inicio del desktop
 * (`BloquesDisponibles`): la partida nace del bloque, no de elegir cancha y horario
 * por separado.
 *
 *   GET /padel-court?clubId=              → canchas activas del club
 *   GET /padel-court/:id/slots?date=      → slots de cada cancha (grilla del bloque)
 *
 * Cada fila es un horario del día (`09:00 – 10:30`) con cuántas canchas están libres;
 * al desplegarlo se ve cancha por cancha (Disponible / Ocupada) y al elegir una libre
 * aparece la duración (1–4 bloques consecutivos libres de ESA cancha, multibloque).
 */
export function ReserveBlocksScreen({
  clubName, latitude, longitude, courtSlots, loading = false, days,
  initialCourtId, onBack, onDayChange, onContinue,
}: Props) {
  const { colors } = useTheme();
  const [dayIdx, setDayIdx] = React.useState(0);
  const [courtFilter, setCourtFilter] = React.useState<string>(initialCourtId ?? '');
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  // Selección: bloque + cancha + cuántos bloques consecutivos.
  const [picked, setPicked] = React.useState<{ blockKey: string; courtId: string } | null>(null);
  const [blocks, setBlocks] = React.useState(1);

  const courts = React.useMemo(() => courtSlots.map((cs) => cs.court), [courtSlots]);

  // El filtro solo acota qué canchas se ven dentro de cada bloque (y qué bloques quedan).
  const visible = React.useMemo(
    () => (courtFilter ? courtSlots.filter((cs) => cs.court.id === courtFilter) : courtSlots),
    [courtSlots, courtFilter],
  );
  const timeBlocks = React.useMemo(() => groupSlotsIntoBlocks(visible), [visible]);

  // Al cambiar de día / filtro se cae la selección: los slots ya no son los mismos.
  React.useEffect(() => {
    setPicked(null);
    setBlocks(1);
    setOpenKey(null);
  }, [courtSlots, courtFilter]);

  const pickedEntry = React.useMemo(() => {
    if (!picked) return null;
    const block = timeBlocks.find((b) => b.key === picked.blockKey);
    const item = block?.items.find((i) => i.court.id === picked.courtId);
    if (!block || !item) return null;
    const slots = courtSlots.find((cs) => cs.court.id === picked.courtId)?.slots ?? [];
    return { block, item, slots };
  }, [picked, timeBlocks, courtSlots]);

  // Bloques consecutivos libres desde el elegido, en la grilla de ESA cancha (tope 4).
  const maxBlocks = pickedEntry
    ? maxConsecutiveFreeBlocks(pickedEntry.slots, pickedEntry.item.index)
    : 1;
  React.useEffect(() => { setBlocks((b) => Math.min(b, maxBlocks)); }, [maxBlocks]);

  // Slot combinado — exactamente lo que se envía a POST /game/reserve.
  const combined: Slot | undefined = pickedEntry
    ? combineSlots(pickedEntry.slots, pickedEntry.item.index, blocks)
    : undefined;

  const day = days?.[dayIdx];
  const canContinue = !!(pickedEntry && combined && day);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Elige un bloque"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text} /></Pressable>}
        right={<Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700' }}>1/2</Text>}
      />
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <StepIndicator step={1} total={2} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>CLUB</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{clubName}</Text>
        </View>

        <MapsButton latitude={latitude} longitude={longitude} query={clubName} />

        {/* Día */}
        {!!days?.length && (
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Día</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 16 }}
              style={{ marginHorizontal: -16, paddingLeft: 16 }}>
              {days.map((d, i) => {
                const on = i === dayIdx;
                return (
                  <Pressable key={d.iso ?? i} onPress={() => { setDayIdx(i); onDayChange?.(d); }}
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
        )}

        {/* Filtro de cancha (opcional: por defecto se ven todas) */}
        {courts.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
            style={{ marginHorizontal: -16, paddingLeft: 16 }}>
            <FilterChip label="Todas las canchas" on={!courtFilter} onPress={() => setCourtFilter('')} />
            {courts.map((c) => (
              <FilterChip key={c.id} label={c.name} on={courtFilter === c.id}
                onPress={() => setCourtFilter(courtFilter === c.id ? '' : c.id)} />
            ))}
          </ScrollView>
        )}

        {/* Bloques del día */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Bloques del día</Text>
            <Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700' }}>
              {timeBlocks.length > 0 ? `${timeBlocks.length} bloques` : ''}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
          ) : timeBlocks.length === 0 ? (
            <View style={{ backgroundColor: colors.bg2, borderRadius: 12, padding: 16, gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Sin bloques disponibles</Text>
              <Text style={{ fontSize: 13, color: colors.muted2, lineHeight: 19 }}>
                {courtFilter
                  ? 'Esta cancha no tiene horarios para este día. Prueba con otro día o mira todas las canchas.'
                  : 'Este club no tiene horarios configurados para este día. Prueba con otro día u otro club.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {timeBlocks.map((block) => (
                <BlockRow
                  key={block.key}
                  block={block}
                  open={openKey === block.key}
                  onToggle={() => setOpenKey(openKey === block.key ? null : block.key)}
                  pickedCourtId={picked?.blockKey === block.key ? picked.courtId : null}
                  onPickCourt={(courtId) => {
                    setPicked({ blockKey: block.key, courtId });
                    setBlocks(1);
                  }}
                  maxBlocks={maxBlocks}
                  blocks={blocks}
                  onChangeBlocks={setBlocks}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 12, color: colors.muted2, fontWeight: '700' }} numberOfLines={1}>
            {pickedEntry && combined
              ? `${pickedEntry.item.court.name} · ${combined.start}–${combined.end}${blocks > 1 ? ` · ${blocks} bloques` : ''}`
              : 'Elige un bloque libre'}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            {combined ? `$${combined.price.toLocaleString('es-AR')}` : '—'}
          </Text>
        </View>
        <Button fullWidth size="lg"
          variant={canContinue ? 'primary' : 'disabled'}
          onPress={() => {
            if (!canContinue || !pickedEntry || !combined || !day) return;
            onContinue?.({ court: pickedEntry.item.court, slot: combined, day, blocks });
          }}>Continuar →</Button>
      </View>
    </SafeAreaView>
  );
}

function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        backgroundColor: on ? colors.primary : colors.surface,
        borderWidth: on ? 0 : 1, borderColor: colors.line,
      }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: on ? colors.primaryFg : colors.text }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Una fila = un horario del día. Cerrada muestra el resumen ("2 de 3 canchas libres");
 * abierta, cancha por cancha. Elegir una cancha libre despliega la duración (multibloque).
 */
function BlockRow({
  block, open, onToggle, pickedCourtId, onPickCourt, maxBlocks, blocks, onChangeBlocks,
}: {
  block: TimeBlock<ClubCourtPublic>;
  open: boolean;
  onToggle: () => void;
  pickedCourtId: string | null;
  onPickCourt: (courtId: string) => void;
  maxBlocks: number;
  blocks: number;
  onChangeBlocks: (n: number) => void;
}) {
  const { colors } = useTheme();
  const { free, total } = blockAvailability(block);
  const hasFree = free > 0;

  return (
    <View style={{
      borderRadius: 14, borderWidth: 1, borderColor: colors.line,
      backgroundColor: colors.surface, overflow: 'hidden',
    }}>
      <Pressable onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 }}>
        {/* Barra de estado: lima = hay canchas libres, contorno = completo (sin colores fuera de marca) */}
        <View style={{
          width: 5, alignSelf: 'stretch', minHeight: 34, borderRadius: 3,
          backgroundColor: hasFree ? colors.primary : colors.bg3,
        }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text }}>
            {block.start} – {block.end}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 2 }}>
            Bloque de {block.duration} min
          </Text>
        </View>
        <View style={{
          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
          backgroundColor: hasFree ? colors.okBg : 'transparent',
          borderWidth: hasFree ? 0 : 1, borderColor: colors.line,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: hasFree ? colors.okFg : colors.muted2 }}>
            {hasFree ? `${free} de ${total} libres` : 'Completo'}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.muted2}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
      </Pressable>

      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 12 }}>
          {block.items.map((item, i) => {
            // "Libre" no alcanza: el bloque en curso llega libre y no es reservable.
            const isFree = isBookable(item.slot);
            const isOwn = item.slot.status === 'own';
            const inProgress = item.slot.started && item.slot.status === 'free';
            const on = pickedCourtId === item.court.id;
            return (
              <View key={item.court.id} style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.line }}>
                <Pressable disabled={!isFree} onPress={() => onPickCourt(item.court.id)}
                  testID={`block-court-${item.court.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: !isFree }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, opacity: isFree ? 1 : 0.6 }}>
                  <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                      {item.court.name}
                    </Text>
                    {item.slot.cams && <Camera size={12} color={colors.muted2} />}
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: isFree ? colors.accentText : colors.muted2 }}>
                    {isFree
                      ? `$${item.slot.price.toLocaleString('es-AR')}`
                      : isOwn ? 'Tuya' : inProgress ? 'En curso' : 'Ocupada'}
                  </Text>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    borderWidth: 2, borderColor: on ? colors.primary : colors.lineStrong,
                    backgroundColor: on ? colors.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: isFree ? 1 : 0,
                  }}>
                    {on && <Check size={12} color={colors.primaryFg} strokeWidth={3} />}
                  </View>
                </Pressable>

                {/* Duración: 1–4 bloques consecutivos libres de ESTA cancha */}
                {on && (
                  <View style={{ paddingBottom: 12, gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted2 }}>Duración</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {Array.from({ length: MAX_BLOCKS }, (_, n) => n + 1).map((n) => {
                        const disabled = n > maxBlocks;
                        const sel = n === blocks;
                        return (
                          <Pressable key={n} disabled={disabled} onPress={() => onChangeBlocks(n)}
                            style={{
                              flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12,
                              backgroundColor: sel ? colors.primary : colors.surface,
                              borderWidth: sel ? 0 : 1, borderColor: colors.line,
                              opacity: disabled ? 0.4 : 1,
                            }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: sel ? colors.primaryFg : colors.text }}>
                              {n === 1 ? '1 bloque' : `${n} bloques`}
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: sel ? colors.primaryFg : colors.muted2, marginTop: 2 }}>
                              {block.duration * n} min
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
