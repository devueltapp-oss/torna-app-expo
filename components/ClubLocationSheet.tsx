/**
 * ClubLocationSheet — "¿Dónde está tu club?", para el rol **club**.
 *
 * Espejo del `ClubLocationDialog` del desktop. Se abre una vez después del login
 * si el club no tiene coordenadas cargadas, porque sin ellas:
 *
 *  - el club no aparece en `GET /club/nearby` ni pone un pin exacto en Maps, y
 *  - **sus partidas abiertas no le avisan a nadie**: el fan-out de
 *    `OPEN_GAME_NEARBY` se ancla en las coordenadas de la cancha.
 *
 * Se puede posponer ("Ahora no"). Bloquear la app por esto dejaría a un club sin
 * poder gestionar un partido que empieza en cinco minutos.
 */
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPin, Navigation, Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button } from './ui';
import { useClubLocation } from '../hooks/useClubLocation';
import type { AddressSuggestion } from '../api/geo';

export interface ClubLocationSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ClubLocationSheet({ visible, onClose, onSaved }: ClubLocationSheetProps) {
  const { colors } = useTheme();
  const club = useClubLocation(visible);

  const handleSave = async () => {
    if (await club.save()) {
      onSaved?.();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }} onPress={onClose}>
        <Pressable
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxHeight: '85%',
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34,
          }}
          onPress={() => {}}
        >
          <View style={{
            alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
            backgroundColor: colors.line, marginBottom: 16,
          }} />

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={20} color={colors.accent} />
              <Text style={{ fontSize: 17, fontFamily: fonts.bold, color: colors.text }}>
                ¿Dónde está tu club?
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: colors.muted2, lineHeight: 19 }}>
              Sin esto, tu club no aparece en el mapa y las partidas que se publiquen buscando
              rivales <Text style={{ fontFamily: fonts.bold }}>no le llegan a los jugadores de
              la zona</Text>. Se carga una sola vez.
            </Text>

            {/* Camino 1: el que siempre funciona, con o sin Geoapify. */}
            {/* `loading` en vez de `disabled`: el Button del design system no
                tiene prop `disabled` — el estado apagado es `variant="disabled"`
                y el spinner ya bloquea el onPress. */}
            <Button variant="primary" fullWidth loading={club.locating} onPress={club.useMyPosition}>
              Usar mi ubicación actual
            </Button>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 }}>
              <Navigation size={12} color={colors.muted2} />
              <Text style={{ fontSize: 11, color: colors.muted2 }}>
                Lo más preciso si estás en el club ahora mismo.
              </Text>
            </View>

            {/* Camino 2: solo si el backend tiene la clave configurada. */}
            {club.searchEnabled && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
                  <Text style={{ fontSize: 11, color: colors.muted2 }}>o</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
                </View>

                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                  borderRadius: 12, paddingHorizontal: 12,
                }}>
                  <Search size={16} color={colors.muted2} />
                  <TextInput
                    value={club.query}
                    onChangeText={club.setQuery}
                    placeholder="Buscar la dirección del club"
                    placeholderTextColor={colors.muted2}
                    style={{ flex: 1, paddingVertical: 12, color: colors.text, fontSize: 14 }}
                  />
                  {club.searching && <ActivityIndicator size="small" color={colors.accent} />}
                </View>

                {club.results.length > 0 && (
                  <View style={{
                    borderWidth: 1, borderColor: colors.line, borderRadius: 12,
                    overflow: 'hidden',
                  }}>
                    {club.results.map((r: AddressSuggestion, i) => (
                      <Pressable
                        key={r.id}
                        onPress={() => club.choose(r)}
                        style={({ pressed }) => ({
                          paddingHorizontal: 12, paddingVertical: 10,
                          borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line,
                          backgroundColor: pressed ? colors.surface : 'transparent',
                        })}
                      >
                        <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={1}>
                          {r.line1 || r.label}
                        </Text>
                        {!!r.line2 && (
                          <Text style={{ fontSize: 11, color: colors.muted2 }} numberOfLines={1}>
                            {r.line2}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            {club.picked && (
              <View style={{
                backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12, gap: 2,
              }}>
                <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.accentText }}>
                  {club.query || club.picked.address || 'Punto seleccionado'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.accentText, opacity: 0.8 }}>
                  {club.picked.latitude.toFixed(5)}, {club.picked.longitude.toFixed(5)}
                </Text>
              </View>
            )}

            {club.problem && (
              <Text style={{ fontSize: 12, color: colors.muted2 }}>
                {messageFor(club.problem)}
              </Text>
            )}

            <Button
              variant={club.picked ? 'primary' : 'disabled'}
              fullWidth
              loading={club.saving}
              onPress={handleSave}
            >
              Guardar ubicación
            </Button>

            <Pressable onPress={onClose} style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.muted2 }}>Ahora no</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Cada motivo se arregla de una forma distinta, así que cada uno tiene su texto. */
function messageFor(problem: NonNullable<ReturnType<typeof useClubLocation>['problem']>): string {
  switch (problem) {
    case 'denied':
      return 'Necesitamos permiso de ubicación. Podés activarlo en Ajustes, o buscar la dirección.';
    case 'unavailable':
      return 'No pudimos ubicarte. Probá al aire libre, o buscá la dirección del club.';
    case 'search':
      return 'No pudimos buscar direcciones ahora. Podés usar tu ubicación actual.';
    case 'save':
      return 'No pudimos guardar la ubicación. Revisá tu conexión e intentá de nuevo.';
    default:
      return '';
  }
}
