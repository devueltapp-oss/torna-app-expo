import React from 'react';
import { View } from 'react-native';
import { SectionHeader } from './ui';
import { LiveGameCard, FeedPost, LiveGameData } from './cards';
import { VideoPreviewModal } from './VideoPreviewModal';
import type { FeedPost as FeedPostData } from '../data/types';

export interface SocialFeedSectionsProps {
  liveGames: LiveGameData[];
  feedPosts?: FeedPostData[];
  onOpenGame?: (id: string) => void;
  /** Like/unlike de un highlight del feed (POST /highlights/:id/like, optimista). */
  onLikeHighlight?: (id: string) => void;
  /** Pausa los previews de video cuando la pantalla/tab no está visible. */
  isActive?: boolean;
  tornaLogo: any;
  /**
   * Se muestra en vez de las secciones cuando las dos listas están vacías.
   * Sin esto, no renderiza nada — el llamador decide si el estado vacío de
   * SU pantalla habla del feed o de otra cosa (ver `HomeScreen`/`ClubHomeScreen`).
   */
  emptyState?: React.ReactNode;
}

/**
 * "En vivo · de quienes seguís" + "Highlights · de tus seguidos" — compartido
 * entre `HomeScreen` (player) y `ClubHomeScreen` (club, 2026-10-02): un club
 * es un `User` más y ya puede seguir jugadores/clubes, así que este feed es
 * agnóstico de rol. Extraído de `HomeScreen` para que las dos pantallas no
 * diverjan con el tiempo — son ~70-90 líneas con reglas ya fijadas por tests
 * (sin botón "Ver todos", un toque no doble toque, `isActive` para pausar
 * video).
 */
export function SocialFeedSections({
  liveGames, feedPosts = [], onOpenGame, onLikeHighlight, isActive = true, tornaLogo, emptyState,
}: SocialFeedSectionsProps) {
  const [highlightModal, setHighlightModal] = React.useState<{ url: string; title: string; id: string } | null>(null);

  if (liveGames.length === 0 && feedPosts.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <>
      {/* En vivo · de quienes seguís — cards a lo ancho, apiladas */}
      {liveGames.length > 0 && (
        <>
          <View style={{ paddingHorizontal: 16 }}>
            {/* Sin acción "Ver todos": las cards ya están todas acá abajo, así
                que era un botón que no llevaba a nada nuevo. */}
            <SectionHeader title="En vivo · de quienes sigues" />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {liveGames.map((g) => (
              <LiveGameCard key={g.id} game={g} onPress={onOpenGame} tornaLogo={tornaLogo} isActive={isActive} />
            ))}
          </View>
        </>
      )}

      {/* Highlights · de tus seguidos — cards a lo ancho, apiladas */}
      {feedPosts.length > 0 && (
        <>
          <View style={{ paddingHorizontal: 16 }}>
            <SectionHeader title="Highlights · de tus seguidos" />
          </View>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {feedPosts.map(p => (
              <FeedPost
                key={p.id}
                post={p}
                fullWidth
                isActive={isActive}
                onOpen={p.type === 'highlight' && p.videoUrl
                  ? () => setHighlightModal({ url: p.videoUrl!, title: p.caption ?? 'Highlight', id: p.id })
                  : undefined}
                onLike={p.type === 'highlight' ? () => onLikeHighlight?.(p.id) : undefined}
              />
            ))}
          </View>
        </>
      )}

      <VideoPreviewModal
        visible={highlightModal !== null}
        url={highlightModal?.url ?? ''}
        title={highlightModal?.title ?? ''}
        durationSeconds={0}
        onClose={() => setHighlightModal(null)}
        highlightId={highlightModal?.id}
        showComments
      />
    </>
  );
}
