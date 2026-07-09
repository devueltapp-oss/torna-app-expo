import React from 'react';
import { Modal, View, Text, Pressable, Image, ScrollView, Alert } from 'react-native';
import { Bell, Check, ChevronRight, MessageCircle, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, Button, StatusBadge } from './ui';
import { ApplyMatchSheet } from './ApplyMatchSheet';
import { acceptApplication, rejectApplication, watchGame, unwatchGame } from '../api/games';
import type { GameApplication, InvitablePlayer, UpcomingGameData, UpcomingGamePlayer } from '../data/types';

export interface UpcomingMatchSheetProps {
  visible: boolean;
  game: UpcomingGameData | null;
  invitablePlayers?: InvitablePlayer[];
  /** Sugerencias por defecto al buscar compañero: gente que seguís / te sigue. */
  suggestedPartners?: InvitablePlayer[];
  /** Búsqueda real de compañero (GET /user/search) rankeada con conexiones primero. */
  onSearchPartner?: (q: string) => Promise<InvitablePlayer[]>;
  /** Abre el chat de la partida (solo participantes). `readOnly` si ya finalizó. */
  onOpenChat?: (gameId: string, title?: string, readOnly?: boolean) => void;
  onClose: () => void;
  onOpenPlayerProfile?: (playerId: string) => void;
  onAcceptApplication?: (gameId: string, appId: string) => void;
  onRejectApplication?: (gameId: string, appId: string) => void;
  /** (Owner) Cancelar la partida entera. */
  onCancelGame?: (gameId: string) => void;
  /** (Miembro no owner) Darse de baja. */
  onLeaveGame?: (gameId: string) => void;
  /** (Pareja retadora — equipo 2) Cancelar la pareja. */
  onCancelPair?: (gameId: string) => void;
}

export function UpcomingMatchSheet({
  visible,
  game,
  invitablePlayers = [],
  suggestedPartners,
  onSearchPartner,
  onOpenChat,
  onClose,
  onOpenPlayerProfile,
  onAcceptApplication,
  onRejectApplication,
  onCancelGame,
  onLeaveGame,
  onCancelPair,
}: UpcomingMatchSheetProps) {
  const { colors } = useTheme();
  const [watching, setWatching] = React.useState(false);
  const [hasApplied, setHasApplied] = React.useState(false);
  const [isWatching, setIsWatching] = React.useState(false);
  const [showApplySheet, setShowApplySheet] = React.useState(false);
  const [localApplications, setLocalApplications] = React.useState<GameApplication[]>([]);

  React.useEffect(() => {
    setHasApplied(false);
    setIsWatching(false);
    setShowApplySheet(false);
    setLocalApplications(game?.applications?.filter(a => a.status === 'PENDING') ?? []);
  }, [game?.id]);

  // Aceptar/rechazar: quitamos la fila optimistamente, pegamos al endpoint real
  // (api/games) y, si falla, restauramos la fila + avisamos. Al terminar bien,
  // notificamos al padre para que refresque la lista de "Mis partidas".
  const handleAccept = async (appId: string) => {
    const gameId = game?.id;
    if (!gameId) return;
    const snapshot = localApplications;
    setLocalApplications(prev => prev.filter(a => a.id !== appId));
    try {
      await acceptApplication(gameId, appId);
      onAcceptApplication?.(gameId, appId);
    } catch (e) {
      setLocalApplications(snapshot);
      Alert.alert('No se pudo aceptar', (e as Error)?.message ?? 'Intentá de nuevo.');
    }
  };

  const handleReject = async (appId: string) => {
    const gameId = game?.id;
    if (!gameId) return;
    const snapshot = localApplications;
    setLocalApplications(prev => prev.filter(a => a.id !== appId));
    try {
      await rejectApplication(gameId, appId);
      onRejectApplication?.(gameId, appId);
    } catch (e) {
      setLocalApplications(snapshot);
      Alert.alert('No se pudo rechazar', (e as Error)?.message ?? 'Intentá de nuevo.');
    }
  };

  const confirmDestructive = (title: string, message: string, action: () => void) => {
    Alert.alert(title, message, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí', style: 'destructive', onPress: action },
    ]);
  };

  const handleCancelGame = () => {
    if (!game) return;
    confirmDestructive(
      'Cancelar partida',
      'Se cancelará la partida para todos los jugadores. ¿Continuar?',
      () => { onCancelGame?.(game.id); onClose(); },
    );
  };

  const handleLeaveGame = () => {
    if (!game) return;
    confirmDestructive(
      'Darme de baja',
      'Vas a salir de esta partida y se liberará tu lugar. ¿Continuar?',
      () => { onLeaveGame?.(game.id); onClose(); },
    );
  };

  const handleCancelPair = () => {
    if (!game) return;
    confirmDestructive(
      'Cancelar nuestra pareja',
      'Se darán de baja los dos jugadores de tu pareja. ¿Continuar?',
      () => { onCancelPair?.(game.id); onClose(); },
    );
  };

  const handleWatch = async () => {
    if (!game || watching) return;
    setWatching(true);
    try {
      if (isWatching) await unwatchGame(game.id);
      else await watchGame(game.id);
      setIsWatching(w => !w);
    } catch {}
    finally { setWatching(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }} onPress={onClose}>
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
          {game && (
            <SheetContent
              game={game}
              colors={colors}
              hasApplied={hasApplied}
              isWatching={isWatching}
              watching={watching}
              pendingApplications={localApplications}
              onOpenApply={() => setShowApplySheet(true)}
              onWatch={handleWatch}
              onOpenChat={onOpenChat}
              onOpenPlayerProfile={onOpenPlayerProfile}
              onAcceptApplication={handleAccept}
              onRejectApplication={handleReject}
              onCancelGame={handleCancelGame}
              onLeaveGame={handleLeaveGame}
              onCancelPair={handleCancelPair}
            />
          )}
        </Pressable>
      </Pressable>

      {game && (
        <ApplyMatchSheet
          visible={showApplySheet}
          game={game}
          invitablePlayers={invitablePlayers}
          suggestedPartners={suggestedPartners}
          onSearchPartner={onSearchPartner}
          onClose={() => setShowApplySheet(false)}
          onApplied={() => setHasApplied(true)}
        />
      )}
    </Modal>
  );
}

interface SheetContentProps {
  game: UpcomingGameData;
  colors: ReturnType<typeof useTheme>['colors'];
  hasApplied: boolean;
  isWatching: boolean;
  watching: boolean;
  pendingApplications: GameApplication[];
  onOpenApply: () => void;
  onWatch: () => void;
  onOpenChat?: (gameId: string, title?: string, readOnly?: boolean) => void;
  onOpenPlayerProfile?: (playerId: string) => void;
  onAcceptApplication?: (appId: string) => void;
  onRejectApplication?: (appId: string) => void;
  onCancelGame?: () => void;
  onLeaveGame?: () => void;
  onCancelPair?: () => void;
}

function SheetContent({
  game, colors, hasApplied, isWatching, watching, pendingApplications,
  onOpenApply, onWatch, onOpenChat, onOpenPlayerProfile,
  onAcceptApplication, onRejectApplication,
  onCancelGame, onLeaveGame, onCancelPair,
}: SheetContentProps) {
  const emptySlots = (game.maxPlayers ?? 4) - game.players.length;
  const isParticipant = !!game.viewerIsParticipant;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
      {/* Header info */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusBadge status="SCHEDULED" />
          <Text style={{ fontSize: 11, color: colors.muted2, fontFamily: fonts.mono }}>{game.id}</Text>
        </View>
        <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.4, marginTop: 6 }}>
          {game.time} · {game.court}
        </Text>
        <Text style={{ color: colors.muted2, fontSize: 13 }}>
          {[game.date, game.club].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {/* Jugadores confirmados */}
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted2 }}>
          Jugadores
        </Text>

        {(() => {
          const renderPlayer = (p: UpcomingGamePlayer) => (
            <Pressable
              key={p.id ?? p.username}
              onPress={() => p.id && onOpenPlayerProfile?.(p.id)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 6, opacity: pressed ? 0.85 : 1,
              })}
            >
              {p.profilePicture ? (
                <Image source={{ uri: p.profilePicture }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              ) : (
                <Avatar name={p.name ?? p.username} size={40} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontFamily: fonts.bold }} numberOfLines={1}>
                  {p.name ?? p.username}
                </Text>
                <Text style={{ color: colors.muted2, fontSize: 12 }} numberOfLines={1}>{p.username}</Text>
              </View>
              {p.id && <ChevronRight size={16} color={colors.muted2} />}
            </Pressable>
          );

          const teamLabel = (n: 1 | 2) => (
            <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.muted2, marginTop: 2 }}>
              {n === 1 ? 'Equipo 1' : 'Pareja retadora'}
            </Text>
          );

          const hasTeams = game.players.some((p) => p.team === 1 || p.team === 2);
          if (!hasTeams) return game.players.map(renderPlayer);

          const team1 = game.players.filter((p) => p.team === 1);
          const team2 = game.players.filter((p) => p.team === 2);
          const noTeam = game.players.filter((p) => p.team !== 1 && p.team !== 2);
          return (
            <>
              {team1.length > 0 && <>{teamLabel(1)}{team1.map(renderPlayer)}</>}
              {team2.length > 0 && <>{teamLabel(2)}{team2.map(renderPlayer)}</>}
              {noTeam.map(renderPlayer)}
            </>
          );
        })()}

        {game.isOpenForPlayers && emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
          <View
            key={`slot-${i}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: colors.muted, fontSize: 18, lineHeight: 20 }}>+</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Lugar disponible</Text>
          </View>
        ))}
      </View>

      {/* Sección postulados — solo para el creador */}
      {game.isCreator && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted2 }}>
              Postulados
            </Text>
            {pendingApplications.length > 0 && (
              <View style={{
                backgroundColor: colors.accent, borderRadius: 10,
                paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 10, fontFamily: fonts.bold, color: colors.primaryFg }}>
                  {pendingApplications.length}
                </Text>
              </View>
            )}
          </View>

          {pendingApplications.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13, paddingVertical: 4 }}>
              Nadie se postula aún
            </Text>
          ) : (
            pendingApplications.map((app: GameApplication) => (
              <ApplicationRow
                key={app.id}
                app={app}
                colors={colors}
                onAccept={() => onAcceptApplication?.(app.id)}
                onReject={() => onRejectApplication?.(app.id)}
              />
            ))
          )}
        </View>
      )}

      {/* Acciones: postularse / gestión / campana */}
      <View style={{ gap: 10 }}>
        {game.isOpenForPlayers && !isParticipant && !game.isCreator && !hasApplied && (
          <Button variant="primary" fullWidth onPress={onOpenApply}>
            Postularme
          </Button>
        )}

        {/* Chat de la partida: solo participantes. Solo-lectura si ya finalizó/canceló. */}
        {isParticipant && onOpenChat && (
          <Pressable
            onPress={() => onOpenChat(
              game.id,
              `${game.time} · ${game.court}`,
              game.status === 'FINISHED' || game.status === 'CANCELLED',
            )}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 12, borderRadius: 12,
              backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1,
            })}
          >
            <MessageCircle size={18} color={colors.primaryFg} />
            <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.primaryFg }}>
              Chat de la partida
            </Text>
          </Pressable>
        )}

        {/* Gestión: solo para participantes */}
        {isParticipant && game.isCreator && (
          <DangerButton label="Cancelar partida" colors={colors} onPress={() => onCancelGame?.()} />
        )}
        {isParticipant && !game.isCreator && (
          <DangerButton label="Darme de baja" colors={colors} onPress={() => onLeaveGame?.()} />
        )}
        {isParticipant && !game.isCreator && game.myTeam === 2 && (
          <DangerButton label="Cancelar nuestra pareja" colors={colors} onPress={() => onCancelPair?.()} />
        )}

        {hasApplied && (
          <View style={{
            backgroundColor: colors.accentSoft, borderRadius: 12,
            paddingHorizontal: 16, paddingVertical: 12,
            alignItems: 'center',
          }}>
            <Text style={{ color: colors.accentText, fontFamily: fonts.bold, fontSize: 13 }}>
              Postulación enviada
            </Text>
          </View>
        )}

        <Pressable
          onPress={onWatch}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 12, borderRadius: 12,
            backgroundColor: isWatching ? colors.accentSoft : colors.surface,
            borderWidth: 1, borderColor: isWatching ? colors.accent : colors.line,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Bell
            size={18}
            color={isWatching ? colors.accentText : colors.muted2}
            fill={isWatching ? colors.accentText : 'none'}
          />
          <Text style={{
            fontSize: 13, fontFamily: fonts.bold,
            color: isWatching ? colors.accentText : colors.muted2,
          }}>
            {isWatching ? 'Notificarme activado' : 'Notificarme cuando empiece'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** Botón de acción destructiva (outline, sin rojo — brand-strict 3 colores). */
function DangerButton({
  label, colors, onPress,
}: { label: string; colors: ReturnType<typeof useTheme>['colors']; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 12,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

interface ApplicationRowProps {
  app: GameApplication;
  colors: ReturnType<typeof useTheme>['colors'];
  onAccept: () => void;
  onReject: () => void;
}


function ApplicationRow({ app, colors, onAccept, onReject }: ApplicationRowProps) {
  return (
    <View style={{
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 12, padding: 12, gap: 10,
    }}>
      {/* Applicant */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={app.applicant.name ?? app.applicant.username} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
            {app.applicant.name ?? app.applicant.username}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted2 }}>{app.applicant.username}</Text>
        </View>
      </View>

      {/* Partner (si aplica) */}
      {app.partner && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 }}>
          <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.muted2, fontSize: 16 }}>+</Text>
          </View>
          <Avatar name={app.partner.name ?? app.partner.username} size={28} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
              {app.partner.name ?? app.partner.username}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted2 }}>{app.partner.username}</Text>
          </View>
        </View>
      )}

      {/* Botones */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onAccept}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 9,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Check size={14} color={colors.primaryFg} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.primaryFg }}>
            Aceptar
          </Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
            borderRadius: 10, paddingVertical: 9, opacity: pressed ? 0.8 : 1,
          })}
        >
          <X size={14} color={colors.muted2} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.muted2 }}>
            Rechazar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
