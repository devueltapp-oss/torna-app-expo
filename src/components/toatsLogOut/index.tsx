import React, {useRef} from 'react';
import {StyleSheet, View, Text, Animated} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

const ToastLogaOut = ({topPercentage}: any) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(() => {
    fadeAnim.setValue(1);
    const fadeOut = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 3085, // Animation duration
      useNativeDriver: true,
    });

    const timeout = setTimeout(() => {
      fadeOut.start();
    }, 3085);

    return () => {
      clearTimeout(timeout);
      fadeOut.stop();
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        // eslint-disable-next-line react-native/no-inline-styles
        {opacity: fadeAnim, top: topPercentage, borderColor: '#ffffff'},
      ]}>
      <View style={styles.subContainer}>
        <Icon
          name="error-outline"
          size={24}
          color={'#bfa92e'}
          style={styles.checkPopup}
        />
        <Text style={styles.descriptionMessage}>
          Si vuelves a presionar, la app se cerrará
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: responsiveWidth(90),
    marginBottom: '5%',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    left: '5%',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    padding: 10,
    zIndex: 100,
  },
  subContainer: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
  },
  descriptionMessage: {
    width: responsiveWidth(75),
    fontSize: responsiveFontSize(2.1),
    color: '#64748B',
    marginLeft: 8,
  },
  checkPopup: {
    marginLeft: 8,
  },
});
export default ToastLogaOut;
