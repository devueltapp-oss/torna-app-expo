import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, Plus } from 'lucide-react-native';
import { useTheme } from '../theme';
import {
  Button, AppHeader, Avatar, SurfaceChip, Switch,
} from '../components/ui';
import { PlayerSearchOverlay } from '../components/PlayerSearchOverlay';
import type { InvitablePlayer, NearbyPlayer } from '../data/types';

interface Props {
  host: NearbyPlayer;
  invitablePlayers: InvitablePlayer[];
  onClose: () => void;
  onConfirm?: (payload: { mode: 'solo' | 'with-partner'; partnerUserId?: string }) => void;
}

/**
 * Join an existing public match (a NearbyPlayer in "Buscar rivales" mode).
 * Two sub-modes:
 *   - solo         → joiner adds themselves as 1 of 2 missing opponents
 *   - with-partner → joiner adds themselves + a partner (other opponent)
 *
 * The host + the host's partner already occupy 2 of the 4 slots; this
 * screen lets the user fill the remaining 1 or 2.
 *
 * In production:
 *   POST /reservations/:id/join { mode, partnerUserId? }
 *     → 200 Reservation (with updated opponents[])
 */
export function JoinMatchScreen({ host, invitablePlayers, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const [withPartner, setWithPartner] = React.useState(false);
  const [partner, setPartner] = React.useState<InvitablePlayer | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // The host's partner is mock data; in prod this comes from the match's
  // existing roster (host's reservation has booker+partnerUserId).
  const hostPartner = invitablePlayers.find(p => p.username === '@lupare') || invitablePlayers[1];
  const me = { id: 'me', name: 'Tú', username: '@vos', rating: 4.3 };

  return (
    <SafeAreaView style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: colors.bg, zIndex: 20,
    }} edges={['top']}>
      <AppHeader title="Unirme al partido"
        left={<Pressable onPress={onClose}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Host card */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.bg2, borderRadius: 14, padding: 12,
        }}>
          <Avatar name={host.name} size={48}/>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, color: colors.muted2 }}>Buscando rivales</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{host.name}</Text>
            <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1 }}>
              {host.username} · ★ {host.rating} · {host.distanceKm} km
            </Text>
          </View>
        </View>

        {/* Match summary */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>EL PARTIDO</Text>
          <View style={{
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
            borderRadius: 12, padding: 12, gap: 6,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Cancha 1 · CLAY</Text>
              <SurfaceChip surface="CLAY"/>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted2 }}>{host.availability} · 90 min · $6.500</Text>
            <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 4, fontWeight: '700', letterSpacing: 0.6 }}>
              CONFIRMADOS · 2 / 4
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
              <MiniSlot name={host.name} role="ANFITRIÓN"/>
              <MiniSlot name={hostPartner.name} role="COMPAÑERO"/>
            </View>
          </View>
        </View>

        {/* Mode toggle */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Voy con compañero</Text>
            <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1, lineHeight: 15 }}>
              {withPartner
                ? 'Te sumás vos + tu compañero. El partido queda completo.'
                : 'Te sumás vos solo como 1 rival. Falta 1 jugador más.'}
            </Text>
          </View>
          <Switch value={withPartner} onChange={setWithPartner}/>
        </View>

        {/* Joiner slots */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            QUIENES SE SUMAN
          </Text>
          <View style={{ gap: 8 }}>
            {/* Current user always added */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
              borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
            }}>
              <Avatar name={me.name} size={36}/>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{me.name} (vos)</Text>
                <Text style={{ fontSize: 11, color: colors.muted2 }}>{me.username} · ★ {me.rating}</Text>
              </View>
              <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: colors.ink, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>RIVAL 1</Text>
              </View>
            </View>

            {withPartner && (
              <PlayerSlotRow player={partner} onChange={() => setSearchOpen(true)}/>
            )}
          </View>
        </View>

        {/* Payment note — same tone as the reservation flow's banner */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
        }}>
          <AlertTriangle size={16} color={colors.accentText}/>
          <Text style={{ flex: 1, fontSize: 12, color: colors.accentText, lineHeight: 17 }}>
            <Text style={{ fontWeight: '800' }}>Pago en el club.</Text> Cada jugador paga su parte al llegar. La cancelación es gratis hasta 4 h antes.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, gap: 8,
      }}>
        <Button fullWidth size="lg" onPress={() => {
          onConfirm?.({
            mode: withPartner ? 'with-partner' : 'solo',
            partnerUserId: withPartner ? partner?.id : undefined,
          });
          onClose();
        }}>
          {withPartner ? 'Unirnos al partido' : 'Unirme al partido'}
        </Button>
        <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: colors.muted2, fontSize: 12, fontWeight: '700' }}>Cancelar</Text>
        </Pressable>
      </View>

      {searchOpen && (
        <PlayerSearchOverlay
          slotLabel="Buscar compañero"
          players={invitablePlayers}
          onSelect={(p) => { setPartner(p); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

function MiniSlot({ name, role }: { name: string; role: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
      <Avatar name={name} size={28}/>
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: 9, color: colors.muted2, fontWeight: '700', letterSpacing: 0.6 }}>{role}</Text>
      </View>
    </View>
  );
}

function PlayerSlotRow({ player, onChange }: { player: InvitablePlayer | null; onChange: () => void }) {
  const { colors } = useTheme();
  if (!player) {
    return (
      <Pressable onPress={onChange} style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.lineStrong, borderStyle: 'dashed',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
      }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={18} color={colors.muted2}/>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted2 }}>Agregar compañero</Text>
      </Pressable>
    );
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    }}>
      <Avatar name={player.name} size={36}/>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{player.name}</Text>
        <Text style={{ fontSize: 11, color: colors.muted2 }}>{player.username} · ★ {player.rating}</Text>
      </View>
      <Pressable onPress={onChange} style={{
        backgroundColor: colors.bg2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      }}>
        <Text style={{ color: colors.text2, fontSize: 11, fontWeight: '700' }}>Cambiar</Text>
      </Pressable>
    </View>
  );
}
