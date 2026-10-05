import React from 'react';
import { View, Text, ScrollView, TextInput, Pressable, FlatList, Image, Animated, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Search, ChevronRight, Users, CalendarPlus, MapPin, Trash2, CircleStop } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { GameListItem, GameListData } from '../components/cards';
import { EmptyState, StatusBadge, Avatar, SectionHeader, CategoryBadge, HostBadge } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { MapsButton } from '../components/MapsButton';
import { NearbyPromptCard } from '../components/NearbyPromptCard';
import { ConfirmSheet } from '../components/ConfirmSheet';
import type { UpcomingGameData } from '../data/types';

type Filter = 'TODAS' | 'LIVE' | 'SCHEDULED' | 'FINISHED' | 'CANCELLED';

interface Props {
  games: GameListData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onPrepareGame?: (id: string) => void;
  onOpenGame?: (id: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  /** `MainPlayer` renderiza una sola tab bar externa y fija: no dupliques la suya. */
  hideBottomTabBar?: boolean;
  emptyImage?: any;
  role?: 'player' | 'club';
  /** (Player) Mis partidas activas — abre el sheet de gestión al tocar. */
  myGames?: UpcomingGameData[];
  /** (Player) Partidas abiertas (isOpenForPlayers) para sumarme. */
  openGames?: UpcomingGameData[];
  /** (Player) Abre el sheet de una partida (gestión si participo, postularme si es abierta). */
  onOpenMyGame?: (game: UpcomingGameData) => void;
  /** (Player) Inicia el flujo de reserva (crear un juego). */
  onReserve?: () => void;
  /**
   * (Player) Ofrecimiento de activar el aviso de partidas cercanas. Va sobre
   * "Abiertos para sumarme" porque es la lista que ese aviso completa: sin este
   * ofrecimiento la función queda en Ajustes y no la encuentra nadie.
   * `undefined` = no mostrar (ya activo, ya descartado, o todavía cargando).
   */
  nearbyPrompt?: {
    radiusKm?: number;
    loading?: boolean;
    onEnable: () => void;
    onDismiss: () => void;
  };
  /** (Club) Agenda una partida nueva en la propia cancha — botón "Agendar" en el header. */
  onCreateGame?: () => void;
  /**
   * (Club) Cancela (soft) una reserva de otro usuario en la propia cancha.
   * Disponible en filas `SCHEDULED` (libera el horario) y `STOPPED` (la
   * cámara nunca se conectó o se cortó, pero el horario sigue siendo
   * válido — ver "DETENIDA" más abajo) — sin esto, ninguna fila se
   * envuelve en `Swipeable` (un swipe que no hace nada es peor que no tenerlo).
   */
  onCancelGame?: (id: string) => Promise<void>;
  /**
   * (Club) Pausa una partida EN VIVO: `services/cohn/gameControl.ts`
   * confirma por BLE que cada cámara dejó de transmitir y recién ahí la
   * pasa a `STOPPED` (`PUT /game/live/:id/stop`) — a diferencia de
   * finalizar, es reanudable: "Reconectar cámara"/"Reanudar transmisión"
   * vuelve a `ClubPrepareGame`, donde "Iniciar streaming" la retoma. Solo
   * filas `LIVE`.
   */
  onPauseGame?: (id: string) => Promise<void>;
  /**
   * (Club) Finaliza manualmente una partida (`LIVE` o `STOPPED`). Es la
   * transición terminal sobre un vivo — no hay "reanudar" desde acá (eso
   * es pausar): dispara el procesado de la grabación. Mismo guard por BLE
   * que pausar: no marca `FINISHED` si no pudo confirmar que la cámara
   * dejó de transmitir.
   */
  onFinishGame?: (id: string) => Promise<void>;
}

const FILTER_LABEL: Record<Filter, string> = {
  TODAS: 'Todas', LIVE: 'En vivo', SCHEDULED: 'Programadas', FINISHED: 'Finalizadas',
  // Oculta por default (ver el filtro de abajo): una partida cancelada es un
  // soft-delete — sigue en la base, pero mostrarla en "Todas" es trash visual
  // para el día a día. Queda accesible a propósito, no desaparece del todo.
  CANCELLED: 'Canceladas',
};

export function GamesScreen({
  games, loading = false, error, onRefresh, onPrepareGame, onOpenGame, onChangeTab, activeTab = 'games', hideBottomTabBar, emptyImage, role = 'club',
  myGames = [], openGames = [], onOpenMyGame, onReserve, nearbyPrompt, onCreateGame, onCancelGame, onFinishGame, onPauseGame,
}: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = React.useState<Filter>('TODAS');
  const [q, setQ] = React.useState('');
  // Una sola hoja de confirmación para las dos acciones (cancelar/finalizar) —
  // `kind` decide el texto, no hace falta duplicar el estado ni el sheet.
  const [actionTarget, setActionTarget] = React.useState<{ id: string; kind: 'cancel' | 'finish' | 'pause' } | null>(null);
  const [menuTarget, setMenuTarget] = React.useState<GameListData | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Vista del player: hub de partidos = Mis partidas + Abiertos para sumarme + Reservar.
  if (role === 'player') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header: título + acción Reservar (crear un juego).
            ⚠️ `colors.bg`, no `colors.surface` — ver el comentario equivalente
            en HomeScreen.tsx (2026-09-09).
            `minHeight: 52` + `paddingVertical: 12` (2026-09-11): igual altura
            que el resto de los headers de la app (`AppHeader`, p. ej. Chats)
            — antes el título más grande y el botón más alto hacían que esta
            fila quedara visiblemente más alta que las demás. */}
        <View style={{
          backgroundColor: colors.bg, paddingHorizontal: 20, paddingVertical: 12, minHeight: 52,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 }}>Juegos</Text>
          </View>
          <Pressable
            onPress={onReserve}
            accessibilityLabel="Reservar cancha"
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 7,
              borderRadius: 10, opacity: pressed ? 0.85 : 1,
            })}
          >
            <CalendarPlus size={15} color={colors.ink} />
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 13 }}>Reservar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 8 }}>
          {/* Mis partidas */}
          <SectionHeader title="Mis partidas" />
          {myGames.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 13, lineHeight: 19, paddingBottom: 8 }}>
              No tienes partidas activas. Reserva una cancha o súmate a un partido abierto.
            </Text>
          ) : (
            <View style={{ gap: 10, paddingBottom: 8 }}>
              {myGames.map(g => (
                <MyGameCard key={g.id} game={g} colors={colors} onPress={() => onOpenMyGame?.(g)} />
              ))}
            </View>
          )}

          {/* Ofrecimiento del aviso por cercanía: justo antes de la lista que
              completa, que es donde su utilidad se explica sola. */}
          {nearbyPrompt && (
            <View style={{ marginTop: 8 }}>
              <NearbyPromptCard
                radiusKm={nearbyPrompt.radiusKm}
                loading={nearbyPrompt.loading}
                onEnable={nearbyPrompt.onEnable}
                onDismiss={nearbyPrompt.onDismiss}
              />
            </View>
          )}

          {/* Abiertos para sumarme */}
          <View style={{ marginTop: 8 }}>
            <SectionHeader title="Abiertos para sumarme" />
          </View>
          {openGames.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 13, lineHeight: 19 }}>
              Cuando haya partidos buscando jugadores, aparecerán aquí para que te sumes.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {openGames.map(g => (
                <OpenGameCard key={g.id} game={g} colors={colors} onOpenDetail={() => onOpenMyGame?.(g)} />
              ))}
            </View>
          )}
        </ScrollView>

        {onChangeTab && !hideBottomTabBar && <BottomTabBar role="player" active={activeTab} onChange={onChangeTab}/>}
      </SafeAreaView>
    );
  }

  const filtered = games.filter(g => {
    // Una cancelada es un soft-delete: sigue en la base, pero mostrarla junto
    // al resto es trash visual (pedido explícito 2026-10-02) — queda afuera de
    // TODOS los filtros salvo el suyo propio ("Canceladas"), que es cómo se
    // busca algo que se sabe que está ahí pero no se quiere ver todo el tiempo.
    if (g.status === 'CANCELLED') return filter === 'CANCELLED';
    if (filter === 'CANCELLED') return false;
    if (filter !== 'TODAS') {
      if (filter === 'FINISHED' && !(g.status === 'FINISHED' || g.status === 'STOPPED')) return false;
      if (filter !== 'FINISHED' && g.status !== filter) return false;
    }
    if (q && !(`${g.id} ${g.court} ${g.cam}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* ⚠️ `colors.bg`, no `colors.surface` — ver el comentario equivalente en
          HomeScreen.tsx (2026-09-09). */}
      <View style={{ backgroundColor: colors.bg, paddingHorizontal: 20, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2 }}>Juegos</Text>
          {/* Agendar partida como club — mismo CTA que "Reservar" del player. */}
          {onCreateGame && (
            <Pressable
              onPress={onCreateGame}
              accessibilityLabel="Agendar partida"
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 10, opacity: pressed ? 0.85 : 1,
              })}
            >
              <CalendarPlus size={15} color={colors.ink} />
              <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 13 }}>Agendar</Text>
            </Pressable>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 }}>
          <Search size={18} color={colors.muted2} />
          <TextInput placeholder="Buscar por cancha o cámara…" placeholderTextColor={colors.muted}
            value={q} onChangeText={setQ}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 12 }}>
          {(Object.keys(FILTER_LABEL) as Filter[]).map(f => {
            const on = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)}
                style={{
                  backgroundColor: on ? colors.ink : colors.bg2,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
                }}>
                <Text style={{ color: on ? '#FFFFFF' : colors.text2, fontSize: 12, fontWeight: '700' }}>{FILTER_LABEL[f]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered} keyExtractor={g => g.id}
        refreshing={loading} onRefresh={onRefresh}
        ListHeaderComponent={error ? <Text accessibilityRole="alert" style={{color: colors.text}}>{error}</Text> : null}
        renderItem={({ item }) => (
          <View style={{gap: 4}}>
          <ClubGameRow
            game={item}
            colors={colors}
            onPress={() => {
              if (submitting) return;
              setMenuTarget(item);
            }}
            onDelete={onCancelGame && (item.status === 'SCHEDULED' || item.status === 'STOPPED') ? () => setActionTarget({ id: item.id, kind: 'cancel' }) : undefined}
            onPause={onPauseGame && item.status === 'LIVE' ? () => setActionTarget({ id: item.id, kind: 'pause' }) : undefined}
            onFinish={onFinishGame && ['LIVE', 'STOPPED'].includes(item.status) ? () => setActionTarget({ id: item.id, kind: 'finish' }) : undefined}
          />
          {/* DETENIDA (2026-10-03): la cámara quedó sin emitir (nunca se conectó
              o se cortó) — no es un estado terminal, el horario sigue siendo
              válido. Mismas dos salidas que una SCHEDULED: reconectar la
              cámara (preparar) o liberar el horario (cancelar, swipe arriba). */}
          {(item.status === 'SCHEDULED' || item.status === 'STOPPED') && onPrepareGame && <Pressable accessibilityRole="button" onPress={() => onPrepareGame(item.id)} style={{padding: 14, backgroundColor: colors.bg2, borderRadius: 10}}>
            <Text style={{color: colors.accentText, fontWeight: '800'}}>{item.status === 'STOPPED' ? 'Reconectar cámara' : 'Iniciar partida · preparar cámaras'}</Text>
          </Pressable>}
          </View>
        )}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <EmptyState
            title={loading ? "Cargando partidas…" : error ? "Agenda no disponible" : "Sin partidos en este filtro"}
            message="Cuando alguien programe o inicie un partido, aparecerá aquí."
            imageSource={emptyImage}
          />
        }
      />

      {/* Una sola hoja para cancelar/finalizar — no nombra la partida a
          propósito, mismo criterio que borrar un chat: ya elegiste la fila.
          `kind` decide el texto; "Finalizar" no tiene "reanudar" del otro
          lado — es terminal, igual que cancelar, pero dispara el procesado
          de la grabación del lado del backend. */}
      <Modal visible={!!menuTarget} transparent animationType="fade" onRequestClose={() => setMenuTarget(null)}>
        <View style={{flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <View style={{padding: 20, borderRadius: 16, backgroundColor: colors.bg, gap: 16}}>
            <Text style={{color: colors.text, fontSize: 20, fontWeight: '700'}}>{menuTarget?.court} · {menuTarget?.time}</Text>
            {menuTarget && [
              ...(['SCHEDULED','STOPPED'].includes(menuTarget.status) && onPrepareGame ? [{label: menuTarget.status === 'STOPPED' ? 'Reanudar transmisión' : 'Preparar cámaras', run: () => onPrepareGame(menuTarget.id)}] : []),
              ...(onOpenGame ? [{label: 'Ver partida', run: () => onOpenGame(menuTarget.id)}] : []),
              ...(['SCHEDULED','STOPPED'].includes(menuTarget.status) && onCancelGame ? [{label: menuTarget.status === 'STOPPED' ? 'Cancelar partida' : 'Borrar partida agendada', run: () => setActionTarget({id: menuTarget.id, kind: 'cancel'})}] : []),
              ...(menuTarget.status === 'LIVE' && onPauseGame ? [{label: 'Pausar transmisión', run: () => setActionTarget({id: menuTarget.id, kind: 'pause'})}] : []),
              ...(['LIVE','STOPPED'].includes(menuTarget.status) && onFinishGame ? [{label: 'Finalizar partida', run: () => setActionTarget({id: menuTarget.id, kind: 'finish'})}] : []),
              {label: 'Cerrar', run: () => {}},
            ].map(option => <Pressable key={option.label} accessibilityRole="button" onPress={() => {setMenuTarget(null); option.run();}} style={{paddingVertical: 12}}><Text style={{color: colors.text}}>{option.label}</Text></Pressable>)}
          </View>
        </View>
      </Modal>
      <ConfirmSheet
        visible={!!actionTarget}
        title={actionTarget?.kind === 'pause' ? 'Pausar esta transmisión' : actionTarget?.kind === 'finish' ? 'Finalizar esta partida' : 'Cancelar esta reserva'}
        message={actionTarget?.kind === 'pause' ? 'Se detendrán las cámaras. Podrás reanudar desde esta partida. Mantené el teléfono cerca de las GoPro.' : actionTarget?.kind === 'finish'
          ? 'Corta la transmisión y queda como FINALIZADA. No se puede deshacer ni reanudar.'
          : 'Se cancela y se avisa a los jugadores. No se puede deshacer.'}
        confirmLabel={actionTarget?.kind === 'pause' ? 'Pausar transmisión' : actionTarget?.kind === 'finish' ? 'Finalizar partida' : 'Cancelar reserva'}
        destructive
        loading={submitting}
        onCancel={() => { if (!submitting) setActionTarget(null); }}
        onConfirm={async () => {
          if (!actionTarget) return;
          const action = actionTarget.kind === 'pause' ? onPauseGame : actionTarget.kind === 'finish' ? onFinishGame : onCancelGame;
          if (__DEV__) console.log('[FINISH DEBUG] confirm sheet onConfirm', { kind: actionTarget.kind, id: actionTarget.id, hasAction: !!action });
          if (!action) return;
          setSubmitting(true);
          try {
            await action(actionTarget.id);
            if (__DEV__) console.log('[FINISH DEBUG] action resolved OK', actionTarget.kind);
            setActionTarget(null);
          } catch (error) {
            if (__DEV__) console.log('[FINISH DEBUG] action FAILED', actionTarget.kind, error instanceof Error ? error.message : error);
            Alert.alert('No se pudo completar la acción', error instanceof Error ? error.message : 'Reintentá cerca de las cámaras.');
          } finally {
            setSubmitting(false);
          }
        }}
      />

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}

/**
 * Fila de "Juegos" (club) — envuelve `GameListItem` en `Swipeable` SOLO si hay
 * `onDelete` (mismo criterio que `ChatRow` de `ChatsInboxScreen`: un swipe que
 * no hace nada es peor que no tenerlo). Mismo patrón de papelera creciendo con
 * el gesto, `rightThreshold`/`overshootRight` para que un swipe corto vuelva
 * solo, y la fila se cierra sola al tocar la papelera.
 */
/**
 * Las dos acciones (cancelar/finalizar) son mutuamente excluyentes por
 * construcción: el llamador solo pasa `onDelete` para filas `SCHEDULED` y
 * `onFinish` para filas `LIVE` (ver el `renderItem` de arriba) — nunca las
 * dos juntas. Mismo patrón que `ChatRow` de `ChatsInboxScreen`: sin acción,
 * no se envuelve en `Swipeable` (un swipe que no hace nada es peor que no
 * tenerlo).
 */
function ClubGameRow({
  game, colors, onPress, onDelete, onFinish, onPause,
}: {
  game: GameListData;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
  onDelete?: () => void;
  onPause?: () => void;
  onFinish?: () => void;
}) {
  const swipeRef = React.useRef<Swipeable>(null);
  const action = onDelete
    ? { run: onDelete, label: 'Cancelar reserva', testId: `game-cancel-${game.id}`, Icon: Trash2 }
    : onFinish
      ? { run: onFinish, label: 'Finalizar partida', testId: `game-finish-${game.id}`, Icon: CircleStop }
      : undefined;

  const renderAction = (progress: Animated.AnimatedInterpolation<number>) => {
    if (!action) return null;
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1], extrapolate: 'clamp' });
    return (
      <View style={{flexDirection: 'row'}}>
      {onPause && <Pressable accessibilityRole="button" accessibilityLabel="Pausar transmisión" onPress={() => {swipeRef.current?.close(); onPause();}} style={{width: 85, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg2}}><Text style={{color: colors.text}}>Pausar</Text></Pressable>}
      <Pressable
        onPress={() => { swipeRef.current?.close(); action.run(); }}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        testID={action.testId}
        style={{ width: 76, marginLeft: 8, borderRadius: 14, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <action.Icon size={22} color={colors.destructiveFg} />
        </Animated.View>
      </Pressable>
      </View>
    );
  };

  const row = <GameListItem game={game} onPress={onPress} />;
  if (!action) return row;

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderAction} overshootRight={false} rightThreshold={40} friction={2}>
      {row}
    </Swipeable>
  );
}

/** Card de una partida propia en "Mis partidas". */
function MyGameCard({
  game, colors, onPress,
}: { game: UpcomingGameData; colors: ReturnType<typeof useTheme>['colors']; onPress: () => void }) {
  const count = game.players.length;
  const max = game.maxPlayers ?? 4;
  const subtitle = game.isOpenForPlayers && count < max
    ? `${count}/${max} · busca jugadores`
    : `${count}/${max} jugadores`;

  /**
   * Postulados esperando respuesta. **Solo se muestra al organizador**: es el
   * único que puede aceptar o rechazar, así que a los demás sería ruido.
   *
   * El dato ya viaja en `GET /game/mine` — no cuesta un request. Sin este badge
   * había que abrir las partidas una por una para descubrir quién esperaba, y el
   * organizador es justo el que tiene que responder rápido: el rival que no
   * recibe respuesta se va a otra partida.
   */
  const pending = game.isCreator
    ? (game.applications ?? []).filter((a) => a.status === 'PENDING').length
    : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: 14, padding: 14, opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* `flexShrink` en el título: en RN el default es 0, así que sin esto el
            texto se queda con su ancho medido, empuja los badges fuera de la
            columna y "CAT. N" termina montado sobre el badge de EN VIVO. Lo que
            cede es el título (ya viene con numberOfLines={1}), no los badges. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{ color: colors.text, fontSize: 15, fontWeight: '800', flexShrink: 1 }}
            numberOfLines={1}
          >
            {game.time} · {game.court}
          </Text>
          {game.isCreator && (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.accentText, letterSpacing: 0.4 }}>ORGANIZÁS</Text>
            </View>
          )}
          <CategoryBadge category={game.category} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Users size={12} color={colors.muted2} />
          {/* `flexShrink: 1` por el mismo motivo que el título de arriba: sin esto
              el texto conserva su ancho medido y empuja el badge fuera de la fila. */}
          <Text style={{ color: colors.muted2, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
            {[game.date, subtitle].filter(Boolean).join(' · ')}
          </Text>
          {pending > 0 && (
            <View
              testID="pending-applications-badge"
              style={{
                // Lima SÓLIDA con texto `ink`, no el par translúcido de
                // `ORGANIZÁS`: esto no es una etiqueta descriptiva, es algo que
                // hay que responder. El lima es el color de acción de la marca.
                flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0,
                backgroundColor: colors.accent, borderRadius: 8,
                paddingHorizontal: 7, paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.ink }}>
                {pending} {pending === 1 ? 'postulado' : 'postulados'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <StatusBadge status={game.status === 'LIVE' ? 'LIVE' : 'SCHEDULED'} />
      <ChevronRight size={18} color={colors.muted2} />
    </Pressable>
  );
}

/** Card de un partido ABIERTO para sumarse (migrado de SearchPlayScreen). */
function OpenGameCard({
  game, colors, onOpenDetail,
}: { game: UpcomingGameData; colors: ReturnType<typeof useTheme>['colors']; onOpenDetail: () => void }) {
  const filled = game.players.length;
  const total = game.maxPlayers ?? 4;
  const host = game.players.find((p) => p.isHost);
  // Ubicación en Maps: coords del club si están, si no el nombre (club + cancha).
  const mapsQuery = [game.club, game.court].filter(Boolean).join(' ');

  return (
    <View style={{
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 16, padding: 14, gap: 12,
    }}>
      <Pressable onPress={onOpenDetail} style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.3 }} numberOfLines={1}>
            {game.time} · {game.court}
          </Text>
          <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: colors.accentText, fontSize: 11, fontFamily: fonts.bold }}>{filled}/{total}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={12} color={colors.muted2}/>
          <Text style={{ color: colors.muted2, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
            {[game.date, game.club].filter(Boolean).join(' · ')}
          </Text>
          <CategoryBadge category={game.category} />
        </View>

        {game.players.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ flexDirection: 'row' }}>
              {game.players.slice(0, 3).map((p, i) => (
                <View key={p.id ?? p.username} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  {p.profilePicture ? (
                    <Image source={{ uri: p.profilePicture }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.surface }} />
                  ) : (
                    <Avatar name={p.name ?? p.username} size={26} />
                  )}
                </View>
              ))}
            </View>
            <Text style={{ color: colors.muted2, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
              {game.players.map((p) => p.name ?? p.username).slice(0, 2).join(', ')}
              {game.players.length > 2 ? ` +${game.players.length - 2}` : ''}
            </Text>
          </View>
        )}

        {/* Quién organiza: sale de GamePlayer.isCaptain del backend. */}
        {host && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HostBadge />
            <Text style={{ color: colors.muted2, fontSize: 12, flexShrink: 1 }} numberOfLines={1}>
              {host.name ?? host.username}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onOpenDetail}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: colors.bg2, borderRadius: 12, paddingVertical: 11, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bold }}>Ver detalle</Text>
          <ChevronRight size={16} color={colors.muted2}/>
        </Pressable>
        <MapsButton compact latitude={game.clubLat} longitude={game.clubLng} query={mapsQuery} />
      </View>
    </View>
  );
}
