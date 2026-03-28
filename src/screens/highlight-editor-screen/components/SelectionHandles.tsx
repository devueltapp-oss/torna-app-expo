import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';

interface SelectionHandlesProps {
  start: number;
  end: number;
  duration: number;
  timelineWidth: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({
  start,
  end,
  duration,
  timelineWidth,
  onStartChange,
  onEndChange,
}) => {
  const safeDuration = duration > 0 ? duration : 1;
  // const startPosition = (start / safeDuration) * timelineWidth;
  // const endPosition = (end / safeDuration) * timelineWidth;
  
  const startPositionRef = useRef((start / safeDuration) * timelineWidth);
  const endPositionRef = useRef((end / safeDuration) * timelineWidth);

  const startPan = React.useRef(new Animated.Value(startPositionRef.current)).current;
  const endPan = React.useRef(new Animated.Value(endPositionRef.current)).current;

  const startPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newPosition = Math.max(
          0,
          Math.min(
            gestureState.moveX - 20, // Ajustar por padding
            endPositionRef.current - 20, // No pasar el handle de fin
          ),
        );
        startPan.setValue(newPosition);
        const newStart = (newPosition / timelineWidth) * safeDuration;
        // onStartChange(Math.max(0, Math.min(newStart, endPositionRef.current - 3)));
        onStartChange(newStart);
      },
      onPanResponderRelease: () => {
        startPan.flattenOffset();
      },
    }),
  ).current;

  const endPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newPosition = Math.max(
          startPositionRef.current + 20, // No pasar el handle de inicio
          Math.min(gestureState.moveX - 20, timelineWidth),
        );
        endPan.setValue(newPosition);
        const newEnd = (newPosition / timelineWidth) * safeDuration;
        // onEndChange(Math.max(startPositionRef.current + 3, Math.min(newEnd, duration)));
        onEndChange(newEnd);
      },
      onPanResponderRelease: () => {
        endPan.flattenOffset();
      },
    }),
  ).current;

  React.useEffect(() => {
    const safeDuration = duration > 0 ? duration : 1;
    const pos = (start / safeDuration) * timelineWidth;
    startPan.setValue(pos);
    startPositionRef.current = pos;
  }, [start, duration, timelineWidth]);

  React.useEffect(() => {
    const safeDuration = duration > 0 ? duration : 1;
    const pos = (end / safeDuration) * timelineWidth;
    endPan.setValue(pos);
    endPositionRef.current = pos;
  }, [end, duration, timelineWidth]);

  return (
    <>
      {/* Handle de inicio */}
      <Animated.View
        style={[
          styles.handle,
          styles.startHandle,
          {
            left: startPan,
            transform: [{ translateX: -10 }],
          },
        ]}
        {...startPanResponder.panHandlers}
      />

      {/* Handle de fin */}
      <Animated.View
        style={[
          styles.handle,
          styles.endHandle,
          {
            left: endPan,
            transform: [{ translateX: -10 }],
          },
        ]}
        {...endPanResponder.panHandlers}
      />
    </>
  );
};

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    top: -5,
    bottom: -5,
    width: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    zIndex: 20,
  },
  startHandle: {
    borderColor: '#4CAF50',
  },
  endHandle: {
    borderColor: '#F44336',
  },
});
