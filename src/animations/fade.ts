import React from 'react';
import {Animated} from 'react-native';

interface UseFadeAnimationProps {
  fadeInConfig?: Animated.TimingAnimationConfig;
  fadeOutConfig?: Animated.TimingAnimationConfig;
}

const FADE_IN_ANIMATION_CONFIG = {
  toValue: 0.7,
  duration: 100,
  useNativeDriver: true,
};

const FADE_OUT_ANIMATION_CONFIG = {
  toValue: 1,
  duration: 100,
  useNativeDriver: true,
};

export default function useFadeAnimation({
  fadeInConfig = FADE_IN_ANIMATION_CONFIG,
  fadeOutConfig = FADE_OUT_ANIMATION_CONFIG,
}: UseFadeAnimationProps = {}) {
  const opacityValue = React.useRef(new Animated.Value(1)).current;

  const fadeIn = () => {
    Animated.timing(opacityValue, fadeInConfig).start();
  };

  const fadeOut = () => {
    Animated.timing(opacityValue, fadeOutConfig).start();
  };

  return {
    opacityValue,
    fadeIn,
    fadeOut,
  };
}
