import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Camera, Check, Radio, Clock } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button, AppHeader, Switch } from '../components/ui';
import type { ClubCameraOption } from './ClubAssignPlayersScreen';

export interface ClubEditCourtScreenProps {
  courtName: string;
  isActive: boolean;
  /** Todas las cámaras del club, para elegir cuáles pertenecen a esta cancha. */
  cameraOptions: ClubCameraOption[];
  /** Cámaras ya asignadas a esta cancha. */
  selectedCameraIds: string[];
  /** Si la cancha tiene una partida en vivo ahora, se puede ir a verla desde aquí. */
  liveGameId?: string | null;
  onWatchLive?: () => void;
  onBack?: () => void;
  /** Abre la pantalla de horarios (semanal + excepciones) de esta cancha. */
  onOpenSchedule?: () => void;
  onSave: (input: { cameraIds: string[]; isActive: boolean }) => void;
  submitting?: boolean;
}

/**
 * Editar cancha (club, 2026-10-02) — SOLO lo que existe de verdad en el
 * backend: qué cámaras le pertenecen (`cameraIds`, multi-select — no hay
 * "cámara por defecto", confirmado contra `CreateCourtDialog.jsx` del
 * desktop) y si la cancha entera está activa (`isActive`). Nombre/descripción/
 * superficie quedan fuera: no fueron parte del pedido y agregarlos es más
 * superficie de la que hace falta tocar hoy.
 */
export function ClubEditCourtScreen({
  courtName, isActive: initialActive, cameraOptions, selectedCameraIds: initialSelected,
  liveGameId, onWatchLive, onBack, onOpenSchedule, onSave, submitting = false,
}: ClubEditCourtScreenProps) {
  const { colors } = useTheme();
  // Mismo bug/fix que `ReserveBlocksScreen`/`BottomTabBar`: footer fuera del
  // SafeAreaView (`edges:['top']`), padding fijo tapado por la barra/gestos
  // de Android edge-to-edge.
  const insets = useSafeAreaInsets();
  const footerPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 18 : Math.max(insets.bottom, 18);
  const [isActive, setIsActive] = React.useState(initialActive);
  const [cameraIds, setCameraIds] = React.useState<string[]>(initialSelected);

  const toggleCamera = (id: string) => {
    setCameraIds((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };

  const dirty = isActive !== initialActive
    || cameraIds.length !== initialSelected.length
    || cameraIds.some((id) => !initialSelected.includes(id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title={courtName}
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {!!liveGameId && (
          <Pressable onPress={onWatchLive} style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: colors.live, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          }}>
            <Radio size={18} color={colors.ink} />
            <Text style={{ flex: 1, fontFamily: fonts.bold, color: colors.ink, fontSize: 13 }}>
              Hay una partida EN VIVO en esta cancha
            </Text>
            <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 12 }}>Ver →</Text>
          </Pressable>
        )}

        {/* Activar/desactivar — campo de la CANCHA entera, no de una cámara. */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Cancha activa</Text>
            <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1, lineHeight: 15 }}>
              Inactiva no entra a la grilla de reservas ni aparece para agendar.
            </Text>
          </View>
          <Switch testID="court-active-switch" value={isActive} onChange={setIsActive} />
        </View>

        {/* Horarios — pantalla propia (semanal + excepciones), por cancha. */}
        {onOpenSchedule && (
          <Pressable onPress={onOpenSchedule} testID="open-court-schedule" style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          }}>
            <Clock size={18} color={colors.muted2} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.text }}>Horarios</Text>
            <ChevronRight size={16} color={colors.muted2} />
          </Pressable>
        )}

        {/* Cámaras asignadas — multi-select, igual que CreateCourtDialog.jsx del desktop. */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            CÁMARAS DE ESTA CANCHA
          </Text>
          {cameraOptions.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.muted2, lineHeight: 18 }}>
              Tu club todavía no tiene cámaras registradas.
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
      </ScrollView>

      <View testID="edit-court-footer" style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: footerPaddingBottom,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface,
      }}>
        <Button
          fullWidth size="lg"
          variant={dirty && !submitting ? 'primary' : 'disabled'}
          loading={submitting}
          onPress={dirty ? () => onSave({ cameraIds, isActive }) : undefined}
        >
          Guardar cambios
        </Button>
      </View>
    </SafeAreaView>
  );
}
