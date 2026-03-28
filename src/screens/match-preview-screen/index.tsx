import React, {useEffect, useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, View, Pressable} from 'react-native';
import {Avatar, AvatarFallbackText, AvatarImage, Text} from '@gluestack-ui/themed';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import CustomHeader from '@/components/header/CustomHeader';
import {colors} from '@/config/theme';
import {MainNavigatorParamList} from '@/navigators/main-navigator';

type Props = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.matchPreview'
>;

const MatchPreviewScreen = ({route}: Props) => {
  const {match} = route.params;
  const insets = useSafeAreaInsets();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [notify, setNotify] = useState(false);

  const hasStartDate = useMemo(() => !!match.startAt, [match.startAt]);

  useEffect(() => {
    if (!match.startAt) {
      setCountdown(null);
      return;
    }

    const startDate = new Date(match.startAt).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = startDate - now;

      if (diff <= 0) {
        setCountdown('¡Comenzando!');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const chunks = [];
      if (days > 0) {
        chunks.push(`${days}d`);
      }
      chunks.push(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
      setCountdown(chunks.join(' '));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [match.startAt]);

  const containerStyles = {
    flex: 1,
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    backgroundColor: colors.background,
  };

  return (
    <View style={containerStyles}>
      <CustomHeader
        textBack="Volver"
        showNotificationIcon={false}
        showProfileIcon={false}
        boolImageTorna={false}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrapper}>
          <Image
            source={{uri: match.imageUrl}}
            style={styles.image}
            resizeMode="cover"
            alt={
              match.clubName
                ? `Imagen de la partida en ${match.clubName}`
                : 'Imagen de la partida'
            }
          />
          {match.badgeLabel ? (
            <View
              style={[
                styles.badge,
                {backgroundColor: match.badgeColor ?? colors.primary},
              ]}>
              <Text style={styles.badgeText} bold>
                {match.badgeLabel}
              </Text>
              {match.badgeSubLabel ? (
                <Text style={styles.badgeSubText}>{match.badgeSubLabel}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} bold>
            {match.clubName}
          </Text>
          <Text style={styles.sectionSubtitle}>{match.floor}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionCaption} bold>
            Jugadores
          </Text>
          <View style={styles.playersList}>
            {match.users.map(player => (
              <View key={player.id} style={styles.playerItem}>
                <Avatar size="md">
                  {player.profilePicture ? (
                    <AvatarImage
                      source={{uri: player.profilePicture}}
                      alt={`Avatar de ${player.name || player.username || 'jugador'}`}
                    />
                  ) : (
                    <AvatarFallbackText>
                      {player.name?.[0] ?? player.username?.[0] ?? '?'}
                    </AvatarFallbackText>
                  )}
                </Avatar>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} bold>
                    {player.name || player.username}
                  </Text>
                  <Text style={styles.playerUsername}>
                    @{player.username}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionCaption} bold>
            Próximo partido
          </Text>
          <View style={styles.countdownRow}>
            {hasStartDate && countdown ? (
              <View style={styles.countdownCard}>
                <Text style={styles.countdownLabel}>Comienza en</Text>
                <Text style={styles.countdownValue} bold>
                  {countdown}
                </Text>
              </View>
            ) : (
              <View style={styles.countdownCard}>
                <Text style={styles.countdownLabel}>
                  Horario próximo disponible
                </Text>
              </View>
            )}
            <Pressable
              style={[
                styles.notifyButton,
                notify && styles.notifyButtonActive,
              ]}
              onPress={() => setNotify(prev => !prev)}>
              <MaterialIcons
                name={notify ? 'notifications-active' : 'notifications-none'}
                size={22}
                color={notify ? colors.white : colors.primary}
              />
              <Text
                style={[
                  styles.notifyText,
                  notify && styles.notifyTextActive,
                ]}>
                Avísame
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: 220,
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.white,
    fontSize: 14,
  },
  badgeSubText: {
    color: colors.neutral100,
    fontSize: 12,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 32,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    color: colors.neutral900,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: colors.neutral500,
  },
  sectionCaption: {
    fontSize: 18,
    color: colors.neutral900,
  },
  playersList: {
    gap: 12,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    color: colors.neutral900,
  },
  playerUsername: {
    fontSize: 14,
    color: colors.neutral500,
  },
  countdownCard: {
    backgroundColor: colors.neutral100,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8,
    flex: 1,
  },
  countdownLabel: {
    fontSize: 14,
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownValue: {
    fontSize: 24,
    color: colors.neutral900,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  notifyButtonActive: {
    backgroundColor: colors.primary,
  },
  notifyText: {
    fontSize: 14,
    color: colors.primary,
  },
  notifyTextActive: {
    color: colors.white,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

export default MatchPreviewScreen;


