import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface SimpleVideoPlayerProps {
  source: {uri: string};
  style?: object;
  onBack?: () => void;
}

export default function SimpleVideoPlayer({
  source,
  style,
  onBack,
}: SimpleVideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const player = useVideoPlayer(source.uri, p => {
    p.play();
  });

  const toggleFullscreen = () => {
    if (isFullscreen) {
      ScreenOrientation.unlockAsync().catch(() => {});
      StatusBar.setHidden(false);
    } else {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => {});
      StatusBar.setHidden(true);
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleBack = () => {
    if (isFullscreen) {
      toggleFullscreen();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, style, isFullscreen && styles.fullscreenContainer]}>
      <VideoView
        player={player}
        style={[styles.video, isFullscreen && styles.fullscreenVideo]}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Controles */}
      {showControls && (
        <View style={styles.controlsOverlay}>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => player.playing ? player.pause() : player.play()}>
              <Text style={styles.controlButtonText}>
                {player.playing ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleFullscreen}>
              <Text style={styles.controlButtonText}>
                {isFullscreen ? '⤓' : '⤢'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tap para mostrar/ocultar controles */}
      <TouchableOpacity
        style={styles.tapArea}
        onPress={() => setShowControls(!showControls)}
        activeOpacity={1}
      />
    </View>
  );
}

const _SCREEN_WIDTH = SCREEN_WIDTH;
const _SCREEN_HEIGHT = SCREEN_HEIGHT;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 999,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 20,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
