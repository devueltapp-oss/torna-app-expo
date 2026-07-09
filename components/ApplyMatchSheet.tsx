import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, Button, Switch } from './ui';
import { PlayerSearchOverlay } from './PlayerSearchOverlay';
import { applyToGame } from '../api/games';
import type { InvitablePlayer, UpcomingGameData } from '../data/types';

export interface ApplyMatchSheetProps {
  visible: boolean;
  game: UpcomingGameData;
  invitablePlayers: InvitablePlayer[];
  /** Sugerencias por defecto en el buscador: gente que seguís / te sigue. */
  suggestedPartners?: InvitablePlayer[];
  /** Búsqueda real de compañero (GET /user/search) rankeada con conexiones primero.
   *  Si se provee, el overlay busca contra la API en vez de filtrar la lista local. */
  onSearchPartner?: (q: string) => Promise<InvitablePlayer[]>;
  onClose: () => void;
  onApplied: () => void;
}

export function ApplyMatchSheet({ visible, game, invitablePlayers, suggestedPartners, onSearchPartner, onClose, onApplied }: ApplyMatchSheetProps) {
  const { colors } = useTheme();
  const [withPartner, setWithPartner] = React.useState(false);
  const [partner, setPartner] = React.useState<InvitablePlayer | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!visible) {
      setWithPartner(false);
      setPartner(null);
      setSubmitting(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await applyToGame(game.id, withPartner && partner ? partner.id : undefined);
      onApplied();
      onClose();
    } catch (e) {
      Alert.alert('No se pudo postular', (e as Error)?.message ?? 'Intentá de nuevo.');
    }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.55)' }} onPress={onClose}>
        <Pressable
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34,
          }}
          onPress={() => {}}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.3 }}>
              Postularme
            </Text>

            {/* Resumen del partido */}
            <View style={{
              backgroundColor: colors.bg2, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 14 }}>
                {game.time} · {game.court}
              </Text>
              <Text style={{ color: colors.muted2, fontSize: 12, marginTop: 2 }}>
                {[game.date, game.club].filter(Boolean).join(' · ')}
              </Text>
            </View>

            {/* Slot fijo: Tú */}
            <View>
              <Text style={{ fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted2, marginBottom: 8 }}>
                Quienes se postulan
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <Avatar name="Tú" size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text }}>Tú</Text>
                  <Text style={{ fontSize: 11, color: colors.muted2 }}>Jugador confirmado</Text>
                </View>
                <View style={{
                  backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                }}>
                  <Text style={{ color: colors.primaryFg ?? colors.ink, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.4 }}>
                    YO
                  </Text>
                </View>
              </View>

              {withPartner && (
                <View style={{ marginTop: 8 }}>
                  <PlayerSlotRow player={partner} onChange={() => setSearchOpen(true)} colors={colors} />
                </View>
              )}
            </View>

            {/* Toggle compañero */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text }}>
                  Voy con compañero
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1, lineHeight: 15 }}>
                  {withPartner
                    ? 'Te postulás vos y tu compañero juntos.'
                    : 'Te postulás solo. El creador puede aceptarte.'}
                </Text>
              </View>
              <Switch value={withPartner} onChange={(v) => { setWithPartner(v); if (!v) setPartner(null); }} />
            </View>

            {/* Acciones */}
            <View style={{ gap: 8 }}>
              <Button
                variant={withPartner && !partner ? 'disabled' : 'primary'}
                fullWidth
                onPress={withPartner && !partner ? undefined : handleConfirm}
              >
                {submitting
                  ? 'Enviando…'
                  : withPartner ? 'Postularnos' : 'Postularme'}
              </Button>
              <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.bold }}>
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>

      {searchOpen && (
        <PlayerSearchOverlay
          slotLabel="Buscar compañero"
          players={onSearchPartner ? (suggestedPartners ?? []) : invitablePlayers}
          onSearch={onSearchPartner}
          onSelect={(p) => { setPartner(p); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </Modal>
  );
}

function PlayerSlotRow({
  player,
  onChange,
  colors,
}: {
  player: InvitablePlayer | null;
  onChange: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (!player) {
    return (
      <Pressable
        onPress={onChange}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.lineStrong,
          borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg3,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Plus size={18} color={colors.muted2} />
        </View>
        <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.muted2 }}>
          Agregar compañero
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    }}>
      <Avatar name={player.name} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text }}>{player.name}</Text>
        <Text style={{ fontSize: 11, color: colors.muted2 }}>{player.username} · ★ {player.rating}</Text>
      </View>
      <Pressable
        onPress={onChange}
        style={{ backgroundColor: colors.bg2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
      >
        <Text style={{ color: colors.text2, fontSize: 11, fontFamily: fonts.bold }}>Cambiar</Text>
      </Pressable>
    </View>
  );
}
