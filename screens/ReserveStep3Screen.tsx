import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, Radio, Plus } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, AppHeader, Avatar, Switch } from '../components/ui';
import { PlayerSearchOverlay } from '../components/PlayerSearchOverlay';
import type { InvitablePlayer } from '../data/types';
import { StepIndicator } from './reserveCommon';

type SlotKey = 'partner' | 'opp1' | 'opp2';

interface Props {
  /** Lista local de candidatos (fallback si no se provee `onSearchPlayers`). */
  invitablePlayers?: InvitablePlayer[];
  /** Búsqueda real de usuarios para invitar (GET /user/search). */
  onSearchPlayers?: (q: string) => Promise<InvitablePlayer[]>;
  /** Optional preselection. */
  initialPartner?: InvitablePlayer;
  initialOpp1?: InvitablePlayer;
  initialOpp2?: InvitablePlayer;
  /** Summary text shown on top (court + datetime + price). */
  summary: { title: string; subtitle: string; priceLabel: string };
  onBack?: () => void;
  onConfirm?: (payload: {
    mode: 'full' | 'search-opponents';
    partnerUserId?: string;
    opponents?: [string?, string?];
    /** Categoría/nivel elegido: 1 = más alta, 7 = iniciación. Opcional. */
    category?: number;
  }) => void;
}

/**
 * Paso 2 de 2 — compañero (obligatorio) + rivales opcionales + confirmar.
 * (El paso 1 es `ReserveBlocksScreen`: elegir un bloque libre del club.)
 *
 *   - Switch "Buscar rivales": OFF = full party (you+partner+2 opp);
 *     ON = only partner required, public match waits for 2 more joiners.
 *   - "Cambiar" on any slot opens PlayerSearchOverlay (autofocused input).
 *
 * In production:
 *   POST /reservations { courtId, date, slotStart, partnerUserId,
 *                       mode, opponents? } → 201 Reservation
 */
export function ReserveStep3Screen({
  invitablePlayers = [],
  onSearchPlayers,
  initialPartner,
  initialOpp1,
  initialOpp2,
  summary,
  onBack,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const [searching, setSearching] = React.useState(false); // "Buscar rivales" switch
  // Categoría de la partida: 1 = más alta, 7 = iniciación (convención de pádel).
  // Opcional: null = sin declarar.
  const [category, setCategory] = React.useState<number | null>(null);
  const [partner, setPartner] = React.useState<InvitablePlayer | null>(initialPartner || invitablePlayers[0] || null);
  const [opp1, setOpp1] = React.useState<InvitablePlayer | null>(initialOpp1 || invitablePlayers[2] || null);
  const [opp2, setOpp2] = React.useState<InvitablePlayer | null>(initialOpp2 || invitablePlayers[3] || null);

  const [searchSlot, setSearchSlot] = React.useState<SlotKey | null>(null);
  const selectFor = (k: SlotKey, p: InvitablePlayer) => {
    if (k === 'partner') setPartner(p);
    else if (k === 'opp1') setOpp1(p);
    else if (k === 'opp2') setOpp2(p);
    setSearchSlot(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Jugadores"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        right={<Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700' }}>2/2</Text>}
      />
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <StepIndicator step={2} total={2}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Match summary */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>{summary.title}</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{summary.subtitle}</Text>
          </View>
          <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>{summary.priceLabel}</Text>
        </View>

        {/* "Buscar rivales" switch */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Buscar rivales</Text>
            <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1, lineHeight: 15 }}>
              Activalo si solo tenés a tu compañero. Tu partido se publica para que otros 2 jugadores se sumen.
            </Text>
          </View>
          <Switch value={searching} onChange={setSearching}/>
        </View>

        {/* Nivel — OBLIGATORIO desde el 2026-08-30: reemplazó a la superficie de la
            cancha como el dato que categoriza la partida, y el desktop lo pide igual. */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            NIVEL · OBLIGATORIO
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const active = category === n;
              return (
                <Pressable
                  key={n}
                  // Ya no se puede deseleccionar: el nivel es obligatorio.
                  onPress={() => setCategory(n)}
                  testID={`level-${n}`}
                  style={{
                    minWidth: 44, alignItems: 'center',
                    backgroundColor: active ? colors.primary : 'transparent',
                    borderWidth: 1.5, borderColor: active ? colors.primary : colors.line,
                    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                  }}
                >
                  <Text style={{
                    fontSize: 13, fontWeight: '800',
                    color: active ? colors.primaryFg : colors.text,
                  }}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 6, lineHeight: 15 }}>
            1 es el nivel más alto y 7 el de iniciación.
          </Text>
        </View>

        {/* Required partner */}
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
            TU COMPAÑERO · OBLIGATORIO
          </Text>
          <PlayerSlot player={partner} onChange={() => setSearchSlot('partner')}/>
        </View>

        {/* Opponents only when full party */}
        {!searching ? (
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8, marginBottom: 6 }}>
              RIVALES
            </Text>
            <View style={{ gap: 8 }}>
              <PlayerSlot player={opp1} onChange={() => setSearchSlot('opp1')}/>
              <PlayerSlot player={opp2} onChange={() => setSearchSlot('opp2')}/>
            </View>
          </View>
        ) : (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 8,
            backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
          }}>
            <Radio size={16} color={colors.accentText}/>
            <Text style={{ flex: 1, fontSize: 12, color: colors.accentText, lineHeight: 17 }}>
              <Text style={{ fontWeight: '800' }}>Buscando rivales.</Text> Tu partido aparecerá en "Próximos partidos públicos" para que otros 2 jugadores se sumen.
            </Text>
          </View>
        )}

        {/* Payment note — same tone treatment as the "Buscando rivales" banner */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
        }}>
          <AlertTriangle size={16} color={colors.accentText}/>
          <Text style={{ flex: 1, fontSize: 12, color: colors.accentText, lineHeight: 17 }}>
            <Text style={{ fontWeight: '800' }}>Pago en el club.</Text> Reservas ahora y pagás {summary.priceLabel} al llegar. La cancelación es gratis hasta 4 h antes.
          </Text>
        </View>
      </ScrollView>

      <View style={{
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18,
        borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, gap: 8,
      }}>
        {!category && (
          <Text style={{ fontSize: 12, color: colors.muted2, textAlign: 'center' }}>
            Elegí el nivel de la partida para confirmar.
          </Text>
        )}
        <Button
          fullWidth
          size="lg"
          variant={category ? 'primary' : 'disabled'}
          onPress={() => {
            // Sin nivel no se reserva: es obligatorio, igual que en el desktop.
            if (!category) return;
            onConfirm?.({
              mode: searching ? 'search-opponents' : 'full',
              partnerUserId: partner?.id,
              opponents: searching ? undefined : [opp1?.id, opp2?.id],
              category,
            });
          }}
        >
          Confirmar reserva
        </Button>
        <Pressable onPress={onBack} style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={{ color: colors.muted2, fontSize: 12, fontWeight: '700' }}>Cancelar</Text>
        </Pressable>
      </View>

      {searchSlot && (
        <PlayerSearchOverlay
          slotLabel={searchSlot === 'partner' ? 'Buscar compañero' : 'Buscar rival'}
          players={invitablePlayers}
          onSearch={onSearchPlayers}
          onSelect={(p) => selectFor(searchSlot, p)}
          onClose={() => setSearchSlot(null)}
        />
      )}
    </SafeAreaView>
  );
}

function PlayerSlot({ player, onChange }: { player: InvitablePlayer | null; onChange: () => void }) {
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
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted2 }}>Agregar jugador</Text>
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
        <Text style={{ fontSize: 11, color: colors.muted2 }}>
          {player.username}{player.rating != null ? ` · ★ ${player.rating}` : ''}
        </Text>
      </View>
      <Pressable onPress={onChange} style={{
        backgroundColor: colors.bg2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      }}>
        <Text style={{ color: colors.text2, fontSize: 11, fontWeight: '700' }}>Cambiar</Text>
      </Pressable>
    </View>
  );
}
