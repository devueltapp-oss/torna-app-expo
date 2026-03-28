import React, {useEffect} from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';

interface VideoPreviewProps {
  recordingUrl: string | null;
  currentTime: number;
  onProgress: (data: {currentTime: number}) => void;
  paused?: boolean;
  seekToTime?: number;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  recordingUrl,
  onProgress,
  paused = false,
  seekToTime,
}) => {
  const player = useVideoPlayer(recordingUrl ?? '', p => {
    if (!paused) {
      p.play();
    }
  });

  // Seek when seekToTime changes
  useEffect(() => {
    if (seekToTime !== undefined) {
      player.currentTime = seekToTime;
    }
  }, [seekToTime, player]);

  // Paused state sync
  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  // Progress tracking
  useEffect(() => {
    const interval = setInterval(() => {
      onProgress({currentTime: player.currentTime});
    }, 250);
    return () => clearInterval(interval);
  }, [onProgress, player]);

  if (!recordingUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={true}
      />
    </View>
  );
};

const {width: _width} = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
});
