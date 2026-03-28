import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, TouchableOpacity, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ClubInfo from './components/club-info';
import CommentsSection from './components/comments-section';

import PlayerList from '@/screens/game-screen/components/player-list';
import StreamPlayer from '@/components/stream-player';
import {Game} from '@/config/types';
import {getGame} from '@/utils/request';
import {useAuth} from '@/contexts/authContext';
import FullViewMessageRacket from '@/components/full-view-message-racket';
import CustomHeader from '@/components/header/CustomHeader';
import {Spinner} from '@/components/Spinner';
import {
  getGameCamerasApi,
  GameCamera,
} from '@/api/games/GetGameCamerasApi';
import {colors} from '@/config/theme';

interface GameScreenProps {
  navigation: any;
  route: any;
}

function GameScreen(props: GameScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {getAccessToken} = useAuth();
  const {gameId} = props.route.params;
  const [game, setGame] = useState<Game | null>();
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState<GameCamera[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);

  const fetchData = async () => {
    setIsLoading(true);

    const accessToken = await getAccessToken();
    try {
      const [gameData, camerasData] = await Promise.all([
        getGame(gameId, accessToken),
        getGameCamerasApi(accessToken, gameId).catch(() => [] as GameCamera[]),
      ]);
      setGame(gameData);
      setCameras(camerasData);
      setActiveCameraIndex(0);
    } catch (error) {
      console.log(error);
    }

    setIsLoading(false);
  };

  const handleCameraSwitch = useCallback((index: number) => {
    setActiveCameraIndex(index);
  }, []);

  // Derive the stream URL: if cameras array has data use it, otherwise fall back to game.stream
  const activeStreamUrl: string | undefined =
    cameras.length > 0 && cameras[activeCameraIndex]?.streamingUrl
      ? cameras[activeCameraIndex].streamingUrl ?? undefined
      : game?.stream;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const containerStyles = {
    flex: 1,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (isLoading) {
    return (
      <View style={containerStyles}>
        <CustomHeader
          textBack="Regresar"
          showNotificationIcon={false}
          showProfileIcon={false}
        />
        <Spinner />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={containerStyles}>
        <CustomHeader
          textBack="Regresar"
          showNotificationIcon={false}
          showProfileIcon={false}
        />
        <FullViewMessageRacket message="La partida no existe" />
      </View>
    );
  } else if (!game.onLive) {
    return (
      <View style={containerStyles}>
        <CustomHeader
          textBack="Regresar"
          showNotificationIcon={false}
          showProfileIcon={false}
        />
        <FullViewMessageRacket message="La transmisión en vivo ha finalizado" />
      </View>
    );
  }

  return (
    <View style={containerStyles}>
      <View style={styles.viewContainer}>
        <View style={styles.streamWrapper}>
          <StreamPlayer
            stream={activeStreamUrl ?? game.stream}
            navigation={props.navigation}
            viewers={game.viewers}
          />
          {/* Camera switch FAB — only visible when game has more than 1 camera */}
          {cameras.length > 1 && (
            <View style={styles.cameraSwitchContainer}>
              {cameras.map((cam, index) => (
                <TouchableOpacity
                  key={cam.id}
                  style={[
                    styles.cameraButton,
                    activeCameraIndex === index && styles.cameraButtonActive,
                  ]}
                  onPress={() => handleCameraSwitch(index)}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.cameraButtonText,
                      activeCameraIndex === index &&
                        styles.cameraButtonTextActive,
                    ]}>
                    {`CAM ${cam.cameraNumber}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <PlayerList players={game.players} />
        <ClubInfo
          id={game.club.id}
          name={game.club.name}
          logoUrl={game.club.logoUrl}
          floor={game.club.floor}
          location={game.club.location}
          isFollowing={game.club.isFollowing}
        />
        <CommentsSection />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    flex: 1,
    alignItems: 'center',
  },
  streamWrapper: {
    width: '100%',
    position: 'relative',
  },
  cameraSwitchContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 20,
  },
  cameraButton: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cameraButtonActive: {
    backgroundColor: colors.primary || '#2d4c75',
    borderColor: colors.primary || '#2d4c75',
  },
  cameraButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cameraButtonTextActive: {
    color: '#fff',
  },
  image: {
    width: '100%',
    height: 200,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
});

export default GameScreen;
