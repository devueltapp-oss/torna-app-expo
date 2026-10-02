import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Camera, Check, Plus, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, AppHeader, Avatar } from '../components/ui';
import { PlayerSearchOverlay } from '../components/PlayerSearchOverlay';
import { LevelPickerSheet, levelLabel } from '../components/LevelPickerSheet';
import type { InvitablePlayer } from '../data/types';

export interface ClubCameraOption { id: string; identifier: string }

interface Props {
  /** Resumen del bloque elegido en el paso 1 (`ReserveBlocksScreen`). Sin precio: el club no se cobra a sí mismo. */
  summary: { title: string; date: string; time: string };
  cameraOptions: ClubCameraOption[];
  /** Búsqueda de jugadores reales (GET /user/search) — NUNCA clubs: el club asigna jugadores, no otro club. */
  onSearchPlayers?: (q: string) => Promise<InvitablePlayer[]>;
  onBack?: () => void;
  onConfirm?: (payload: { cameraIds: string[]; playerIds: string[]; category: number }) => void;
  submitting?: boolean;
}

/**
 * Paso 2 de "Agendar partida" (club) — cámaras de esa cancha + categoría
 * obligatoria + N jugadores reales, sin pareja obligatoria ni rivales (ese
 * esquema es de `ReserveStep3Screen`, pensado para el player reservando para
 * sí mismo; acá el club asigna jugadores libremente, igual que
 * `CreateGameDialog.jsx` del desktop).
 */
export function ClubAssignPlayersScreen({
  summary, cameraOptions, onSearchPlayers, onBack, onConfirm, submitting = false,
}: Props) {
  const { colors } = useTheme();
  // Mismo bug/fix que `ReserveBlocksScreen`/`BottomTabBar`: footer fuera del
  // SafeAreaView (`edges:['top']`), padding fijo tapado por la barra/gestos
  // de Android edge-to-edge.
  const insets = useSafeAreaInsets();
  const footerPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 18 : Math.max(insets.bottom, 18);
  const [cameraIds, setCameraIds] = React.useState<string[]>([]);
  const [category, setCategory] = React.useState<number | null>(null);
  const [levelSheet, setLevelSheet] = React.useState(false);
  const [players, setPlayers] = React.useState<InvitablePlayer[]>([]);
  const [searching, setSearching] = React.useState(false);

  const toggleCamera = (id: string) => {
    setCameraIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };
  const addPlayer = (p: InvitablePlayer) => {
    setPlayers((xs) => (xs.some((x) => x.id === p.id) ? xs : [...xs, p]));
    setSearching(false);
  };
  const removePlayer = (id: string) => setPlayers((xs) => xs.filter((x) => x.id !== id));

  const canConfirm = category != null && cameraIds.length > 0 && players.length > 0 && !submitting;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Jugadores y cámaras"
        flush
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Resumen del bloque — mismo tratamiento que ReserveStep3Screen, sin precio. */}
        <View style={{
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>{summary.title}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>{summary.date}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted2, marginTop: 1 }}>{summary.time}</Text>
        </View>

        {/* Nivel — obligatorio, mismo campo que la reserva del player. */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            NIVEL · OBLIGATORIO
          </Text>
          <Pressable
            onPress={() => setLevelSheet(true)}
            testID="level-field"
            accessibilityRole="button"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              borderWidth: 1.5, borderColor: colors.line, borderRadius: 12,
              backgroundColor: colors.surface,
              paddingHorizontal: 14, paddingVertical: 13,
            }}
          >
            <Text style={{ flex: 1, fontSize: 15, color: category == null ? colors.muted2 : colors.text }}>
              {levelLabel(category)}
            </Text>
            <ChevronDown size={18} color={colors.muted2} />
          </Pressable>
        </View>
        <LevelPickerSheet
          visible={levelSheet}
          value={category}
          onSelect={setCategory}
          onClose={() => setLevelSheet(false)}
        />

        {/* Cámaras de la cancha — al menos 1, igual que exige el desktop. */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            CÁMARAS · AL MENOS 1
          </Text>
          {cameraOptions.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.muted2, lineHeight: 18 }}>
              Esta cancha no tiene cámaras configuradas en Desktop.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {cameraOptions.map((cam) => {
                const checked = cameraIds.includes(cam.id);
                return (
                  <Pressable key={cam.id} onPress={() => toggleCamera(cam.id)}
                    accessibilityRole="checkbox" accessibilityState={{ checked }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: colors.surface, borderWidth: 1, borderColor: checked ? colors.accentText : colors.line,
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                    }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: checked ? colors.accent : colors.bg3,
                      borderWidth: checked ? 0 : 1.5, borderColor: colors.lineStrong,
                    }}>
                      {checked && <Check size={14} color={colors.ink}/>}
                    </View>
                    <Camera size={16} color={colors.muted2}/>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{cam.identifier}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Jugadores reales — sin pareja obligatoria ni rivales: el club los
            asigna libremente, a diferencia de la reserva del player. */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            JUGADORES · AL MENOS 1
          </Text>
          <View style={{ gap: 8 }}>
            {players.map((p) => (
              <View key={p.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <Avatar name={p.name} size={36}/>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{p.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted2 }}>{p.username}</Text>
                </View>
                <Pressable
                  onPress={() => removePlayer(p.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar jugador"
                  style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg2 }}
                >
                  <X size={14} color={colors.text2}/>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => setSearching(true)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.lineStrong, borderStyle: 'dashed',
              borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} color={colors.muted2}/>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted2 }}>Agregar jugador</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View testID="assign-players-footer" style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: footerPaddingBottom,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, gap: 8,
      }}>
        <Button
          fullWidth
          size="lg"
          variant={canConfirm ? 'primary' : 'disabled'}
          loading={submitting}
          onPress={() => {
            if (!canConfirm || category == null) return;
            onConfirm?.({ cameraIds, playerIds: players.map((p) => p.id), category });
          }}
        >
          Crear partida
        </Button>
      </View>

      {searching && (
        <PlayerSearchOverlay
          slotLabel="Agregar jugador"
          onSearch={onSearchPlayers}
          onSelect={addPlayer}
          onClose={() => setSearching(false)}
        />
      )}
    </SafeAreaView>
  );
}
