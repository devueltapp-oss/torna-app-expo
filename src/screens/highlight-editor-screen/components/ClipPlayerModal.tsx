import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';
import {ClipResponse} from '@/api/video/PostCreateClipApi';
import {colors} from '@/config/theme';
import {formatDuration} from '@/utils/video/formatDuration';

interface ClipPlayerModalProps {
  visible: boolean;
  clip: ClipResponse | null;
  onClose: () => void;
}

export const ClipPlayerModal: React.FC<ClipPlayerModalProps> = ({
  visible,
  clip,
  onClose,
}) => {
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const player = useVideoPlayer(clip?.clipUrl ?? '', p => {
    if (visible) {
      p.play();
    }
  });

  // Pause/resume sync
  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  // Pause when modal closes
  useEffect(() => {
    if (!visible) {
      player.pause();
    } else {
      player.play();
      setPaused(false);
      setCurrentTime(0);
    }
  }, [visible, player]);

  // Progress tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(player.currentTime);
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  // Load duration
  useEffect(() => {
    const subscription = player.addListener('statusChange', event => {
      if (event.status === 'readyToPlay') {
        setDuration(player.duration ?? 0);
      }
    });
    return () => subscription.remove();
  }, [player]);

  // End detection
  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      setPaused(true);
      setCurrentTime(0);
      player.currentTime = 0;
    });
    return () => subscription.remove();
  }, [player]);

  if (!clip) {
    return null;
  }

  const handlePlayPause = () => {
    setPaused(!paused);
  };

  const handleSeek = (seconds: number) => {
    player.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Clip</Text>
            <Text style={styles.headerSubtitle}>
              {formatDuration(clip.start)} - {formatDuration(clip.end)}
            </Text>
          </View>
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />

          {/* Play/Pause Overlay */}
          {paused && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
              activeOpacity={0.8}>
              <Text style={styles.playIcon}>▶</Text>
            </TouchableOpacity>
          )}

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${progress}%`}]} />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatDuration(Math.floor(currentTime))}
              </Text>
              <Text style={styles.timeText}>
                {formatDuration(Math.floor(duration))}
              </Text>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayPause}
            activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>
              {paused ? '▶ Reproducir' : '⏸ Pausar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => handleSeek(0)}
            activeOpacity={0.7}>
            <Text style={styles.controlButtonText}>⏮ Reiniciar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark || '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.dark || '#000',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral800 || '#1E293B',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.white || '#fff',
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white || '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral400 || '#94A3B8',
    marginTop: 2,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark || '#000',
    position: 'relative',
  },
  video: {
    width: width,
    height: height * 0.6,
  },
  playButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 40,
    color: colors.white || '#fff',
    marginLeft: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral700 || '#334155',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary || '#007AFF',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: colors.white || '#fff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.dark || '#000',
    borderTopWidth: 1,
    borderTopColor: colors.neutral800 || '#1E293B',
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary || '#007AFF',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  controlButtonText: {
    color: colors.white || '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
