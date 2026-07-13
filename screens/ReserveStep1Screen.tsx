import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Line } from 'react-native-svg';
import { ChevronLeft, Check, Camera } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, AppHeader, SurfaceChip } from '../components/ui';
import { MapsButton } from '../components/MapsButton';
import type { ClubCourtPublic } from '../data/types';
import { StepIndicator } from './reserveCommon';

interface Props {
  clubName: string;
  courts: ClubCourtPublic[];
  /** True mientras se cargan las canchas del club. */
  loading?: boolean;
  /** Ubicación del club para el mapa. */
  latitude?: number | null;
  longitude?: number | null;
  /** Initial selection (e.g. court tapped from ClubProfile's Reservar CTA). */
  initialCourtId?: string;
  onBack?: () => void;
  onContinue?: (courtId: string) => void;
}

/**
 * Step 1 of 3 — elegir la cancha del club a reservar. Solo se listan las canchas
 * **disponibles** (activas). Estados de carga y vacío para que un club sin canchas
 * no deje al usuario en un callejón.
 *   GET /padel-court?clubId=  → canchas del club (con isActive)
 */
export function ReserveStep1Screen({ clubName, courts, loading = false, latitude, longitude, initialCourtId, onBack, onContinue }: Props) {
  const { colors } = useTheme();
  // "Disponibles" = canchas activas (las inactivas no tienen horarios ni reservas).
  const available = React.useMemo(() => courts.filter((c) => c.active !== false), [courts]);
  const [selected, setSelected] = React.useState<string>('');
  // Al llegar las canchas, preseleccionar la inicial (o la primera disponible).
  React.useEffect(() => {
    setSelected((prev) => {
      if (prev && available.some((c) => c.id === prev)) return prev;
      if (initialCourtId && available.some((c) => c.id === initialCourtId)) return initialCourtId;
      return available[0]?.id ?? '';
    });
  }, [available, initialCourtId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Reservar cancha"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        right={<Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700' }}>1/3</Text>}
      />
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <StepIndicator step={1}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>CLUB</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 }}>{clubName}</Text>
        </View>

        {/* Referencia a Google Maps (sin mapa embebido) */}
        <MapsButton latitude={latitude} longitude={longitude} query={clubName} />

        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Canchas disponibles</Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
        ) : available.length === 0 ? (
          <View style={{ backgroundColor: colors.bg2, borderRadius: 12, padding: 16, gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Sin canchas disponibles</Text>
            <Text style={{ fontSize: 13, color: colors.muted2, lineHeight: 19 }}>
              Este club todavía no tiene canchas habilitadas para reservar. Probá con otro club.
            </Text>
          </View>
        ) : (
        <View style={{ gap: 10 }}>
          {available.map(c => {
            const on = c.id === selected;
            return (
              <Pressable key={c.id} onPress={() => setSelected(c.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1.5, borderColor: on ? colors.primary : colors.line,
                  borderRadius: 14, padding: 12,
                  ...(on ? { shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 0 }, shadowRadius: 0 } : {}),
                }}>
                <View style={{
                  width: 64, height: 56, borderRadius: 10, overflow: 'hidden',
                  backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Svg viewBox="0 0 200 110" width="85%" style={{ opacity: 0.3 }}>
                    <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
                    <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
                  </Svg>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>{c.name}</Text>
                    <SurfaceChip surface={c.surface}/>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Camera size={11} color={colors.muted2}/>
                      <Text style={{ fontSize: 11, color: colors.muted2 }}>{c.cams}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.muted2 }}>·</Text>
                    <Text style={{ fontSize: 11, color: colors.muted2 }}>{c.indoor ? 'Cubierta' : 'Exterior'}</Text>
                  </View>
                </View>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2, borderColor: on ? colors.primary : colors.lineStrong,
                  backgroundColor: on ? colors.primary : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <Check size={12} color={colors.primaryFg} strokeWidth={3}/>}
                </View>
              </Pressable>
            );
          })}
        </View>
        )}
      </ScrollView>

      <View style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface,
      }}>
        <Button fullWidth size="lg"
          variant={selected ? 'primary' : 'disabled'}
          onPress={() => selected && onContinue?.(selected)}>Ver horarios →</Button>
      </View>
    </SafeAreaView>
  );
}
