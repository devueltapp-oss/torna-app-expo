/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, Text, Animated} from 'react-native';

import CheckPopup from '@/assets/icons/check-popup-icon';

type PopupProps = {
  description?: string;
  positionTop?: any;
};

const Popup = ({description, positionTop = '85%'}: PopupProps) => {
  // Define the animated value for opacity
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the fade-out animation after a short delay
    const fadeOut = Animated.timing(fadeAnim, {
      toValue: 0, // Fade out to opacity 0
      duration: 900, // Animation duration (500ms)
      useNativeDriver: true,
    });

    // Wait 1.5 seconds before starting the fade-out
    const timeout = setTimeout(() => {
      fadeOut.start();
    }, 1500);

    // Clean up the timeout and animation when the component unmounts
    return () => {
      clearTimeout(timeout);
      fadeOut.stop();
    };
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[styles.container, {opacity: fadeAnim, top: positionTop}]}>
      <View style={styles.subContainer}>
        <CheckPopup style={styles.checkPopup} />
        <Text style={styles.titleMessage}>{description}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 'auto',
    minWidth: 200,
    maxWidth: '80%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  titleMessage: {
    fontWeight: '500',
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 16,
  },
  checkPopup: {
    width: 18,
    height: 18,
  },
});

export default Popup;
