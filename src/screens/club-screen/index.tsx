import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {Avatar, Text} from '@gluestack-ui/themed';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CustomHeader from '@/components/header/CustomHeader';
import {colors} from '@/config/theme';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import MatchCard from '@/components/match-card';
import CourtList, {ClubCourt} from './components/CourtList';
import {
  CLUB_FAKE_DATA,
  ClubData,
  DEFAULT_CLUB,
} from './club-data';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = NativeStackScreenProps<MainNavigatorParamList, 'screens.club'>;

const ClubScreen = ({route, navigation}: Props) => {
  const insets = useSafeAreaInsets();
  const {clubId} = route.params;
  const club = useMemo(
    () => CLUB_FAKE_DATA[clubId as keyof typeof CLUB_FAKE_DATA] ?? DEFAULT_CLUB,
    [clubId],
  );

  const statCards = useMemo(
    () => [
      {label: 'Miembros', value: club.stats.members.toString()},
      {label: 'Canchas', value: club.stats.courts.toString()},
      {label: 'Torneos', value: club.stats.tournaments.toString()},
      {label: 'Coaches', value: club.stats.coaches.toString()},
    ],
    [club.stats],
  );

  const [activeTab, setActiveTab] = useState<'courts' | 'matches'>('courts');
  const tabContentRef = useRef<ScrollView | null>(null);

  const containerStyles = {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: insets.top,
  };

  const handleOnPressMatch = useCallback(
    (payload: {
      type: 'match' | 'club' | 'upcoming';
      matchId?: string;
      clubId?: string;
      match?: any;
    }) => {
      if (payload.type === 'match' && payload.matchId) {
        navigation.navigate('screens.gameScreen', {
          gameId: payload.matchId,
        });
        return;
      }

      if (payload.type === 'club' && payload.clubId) {
        navigation.navigate('screens.club', {clubId: payload.clubId});
        return;
      }

      if (payload.type === 'upcoming' && payload.match) {
        navigation.navigate('screens.matchPreview', {
          match: payload.match,
        });
      }
    },
    [navigation],
  );

  const handleTabPress = useCallback(
    (tab: 'courts' | 'matches') => {
      const index = tab === 'courts' ? 0 : 1;
      setActiveTab(tab);
      tabContentRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
    },
    [],
  );

  const handleTabMomentum = useCallback((event: any) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );
    setActiveTab(index === 0 ? 'courts' : 'matches');
  }, []);

  const tabItems = useMemo(
    () =>
      [
        {
          key: 'courts' as const,
          label: 'Canchas',
        },
        {
          key: 'matches' as const,
          label: 'Partidas destacadas',
        },
      ],
    [],
  );

  const handleReserveCourt = useCallback(
    (court: ClubCourt) => {
      navigation.navigate('screens.reserveCourt', {
        clubId,
        court,
      });
    },
    [clubId, navigation],
  );

  return (
    <View style={containerStyles}>
      <CustomHeader
        textBack="Volver"
        showNotificationIcon={false}
        showProfileIcon={false}
        boolImageTorna={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <ImageBackground source={{uri: club.banner}} style={styles.banner}>
          <View style={styles.bannerOverlay} />
        </ImageBackground>
        <View style={styles.headerContent}>
          <Avatar size="xl" style={styles.avatar}>
            <Avatar.Image
              source={{uri: club.avatar}}
              alt={
                club.name
                  ? `Avatar del club ${club.name}`
                  : 'Avatar del club'
              }
            />
          </Avatar>
          <Text style={styles.clubName} bold>
            {club.name}
          </Text>
          <Text style={styles.clubLocation}>{club.location}</Text>
          <Text style={styles.clubDescription}>{club.description}</Text>
        </View>

        <View style={styles.statsRow}>
          {statCards.map(card => (
            <View key={card.label} style={styles.statCard}>
              <Text style={styles.statValue} bold>
                {card.value}
              </Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tabToggle}>
          {tabItems.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.tabButton,
                  isActive && styles.tabButtonActive,
                ]}
                onPress={() => handleTabPress(tab.key)}>
                <Text
                  style={[
                    styles.tabButtonText,
                    isActive && styles.tabButtonTextActive,
                  ]}
                  bold>
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.tabUnderline,
                    isActive && styles.tabUnderlineActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          ref={tabContentRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleTabMomentum}
          style={styles.tabContentScroll}>
          <View style={styles.tabPage}>
            <CourtList
              courts={club.courts}
              onReserve={handleReserveCourt}
              scrollEnabled={false}
            />
          </View>
          <View style={styles.tabPage}>
            {club.upcomingMatches.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle} bold>
                  No hay partidas destacadas
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  Te avisaremos apenas haya nuevas partidas para este club.
                </Text>
              </View>
            ) : (
              club.upcomingMatches.map(match => {
                const normalizedUsers = match.users.map(user => ({...user}));
                const normalizedMatch = {...match, users: normalizedUsers};
                return (
                  <MatchCard
                    key={match.id}
                    id={normalizedMatch.id}
                    imageUrl={normalizedMatch.imageUrl}
                    users={normalizedUsers}
                    clubName={normalizedMatch.clubName}
                    floor={normalizedMatch.floor}
                    clubId={clubId}
                    badgeLabel={normalizedMatch.badgeLabel}
                    badgeColor={normalizedMatch.badgeColor}
                    badgeSubLabel={normalizedMatch.badgeSubLabel}
                    previewMode={normalizedMatch.previewMode}
                    showVideoPlayer={false}
                    isLive={normalizedMatch.isLive}
                    onPress={payload => {
                      if (payload.type === 'upcoming') {
                        handleOnPressMatch({
                          type: 'upcoming',
                          match: normalizedMatch,
                        });
                        return;
                      }
                      handleOnPressMatch(payload as any);
                    }}
                    startAt={normalizedMatch.startAt}
                  />
                );
              })
            )}
          </View>
        </ScrollView>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
    backgroundColor: colors.white,
  },
  banner: {
    height: 180,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -60,
    marginBottom: 24,
  },
  avatar: {
    borderWidth: 4,
    borderColor: colors.white,
    marginBottom: 16,
  },
  clubName: {
    fontSize: 24,
    color: colors.neutral900,
  },
  clubLocation: {
    fontSize: 16,
    color: colors.neutral500,
  },
  clubDescription: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.neutral600,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.neutral100,
    borderRadius: 16,
    marginHorizontal: 6,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    color: colors.neutral900,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyState: {
    marginHorizontal: 16,
    backgroundColor: colors.neutral100,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: colors.neutral900,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.neutral500,
    textAlign: 'center',
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: colors.white,
  },
  tabButtonText: {
    fontSize: 15,
    color: colors.neutral500,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: colors.primary,
  },
  tabContentScroll: {
    marginBottom: 16,
  },
  tabPage: {
    width: SCREEN_WIDTH,
    paddingBottom: 24,
  },
});

export default ClubScreen;


