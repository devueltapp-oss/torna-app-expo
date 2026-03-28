import MatchCard from "@/components/match-card";
import { HomeMatchCard, MatchParticipant } from "..";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { useCallback } from "react";

export default function RenderMatchCard({
  item,
  handleOnPress,
  firebaseUser
}: {
  item: HomeMatchCard,
  handleOnPress?: ((payload: any) => void) | undefined,
  firebaseUser: FirebaseAuthTypes.User,
}) {
  const match = item;
  const isUpcoming = !match.isLive;
  const badgeLabel = isUpcoming
    ? match.badgeSubLabel ?? match.badgeLabel
    : match.badgeLabel;
  const badgeColor = isUpcoming ? '#FFB347' : match.badgeColor;
  
  const formatUsers = (players: MatchParticipant[]) => {
    if (!players) {
      return [];
    }

    const currentUserId = firebaseUser?.uid;

    if (!currentUserId) {
      return players;
    }

    const others: MatchParticipant[] = [];
    let currentUser: MatchParticipant | null = null;

    players.forEach(player => {
      if (player.id === currentUserId) {
        currentUser = player;
      } else {
        others.push(player);
      }
    });

    if (currentUser) {
      others.push(currentUser);
    }

    return others;
  };

  return (
    <MatchCard
      id={match.id}
      imageUrl={match.imageUrl}
      viewers={match.viewers}
      users={formatUsers(match.users)}
      clubName={match.clubName}
      floor={match.floor}
      clubId={match.clubId}
      onPress={handleOnPress}
      showVideoPlayer={false}
      previewMode={match.previewMode ?? 'versus'}
      currentUserId={firebaseUser?.uid ?? null}
      badgeLabel={badgeLabel}
      badgeColor={badgeColor}
      badgeSubLabel={isUpcoming ? undefined : match.badgeSubLabel}
      isLive={match.isLive}
      startsIn={match.startsIn}
      startAt={match.startAt}
    />
  );
}