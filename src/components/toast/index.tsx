/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useState, useRef, useEffect} from 'react';
import {StyleSheet, View, Text, Animated} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
// import {useFocusEffect} from '@react-navigation/native';
import {
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';

import {colors} from '../../config/theme';

interface ToastRequest {
  status: {
    error: any;
  };
  topPercentage:
    | number
    | 'auto'
    | `${number}%`
    | Animated.Value
    | Animated.AnimatedInterpolation<string | number>
    | Animated.WithAnimatedObject<Animated.AnimatedNode>
    | null
    | undefined;
}

const ToastRequest = ({status, topPercentage}: ToastRequest) => {
  const toastDuration = 1650;
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [dataVoid, setDataVoid] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status !== null) {
      switch (status.error) {
        case 400:
          setDescriptionError('Los datos enviados no son válidos');
          break;
        case 404:
          setDescriptionError('No se encontró el club indicado');
          break;
        case 401:
          setDescriptionError('Usuario no autorizado');
          break;
        case 500:
          setDescriptionError('El servidor no responde, intenta más tarde');
          break;
        case 504:
          setDescriptionError('El tiempo de espera del servidor se ha agotado');
          break;
        case 800:
          setDataVoid(true);
          setDescriptionError(
            'No hay datos disponibles para mostrar en este momento',
          );
          break;
        default:
          if (typeof status.error === 'string') {
            setDescriptionError(status.error);
          } else {
            setDescriptionError('Ha ocurrido un error inesperado');
          }
          break;
      }

      setShow(true);
    }
    // Reset opacity to 1 when the toast is shown again
    fadeAnim.setValue(1);
    // Start the fade-out animation after a short delay
    const fadeOut = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: toastDuration, // Animation duration
      useNativeDriver: true,
    });

    // Wait before starting the fade-out
    const timeout = setTimeout(() => {
      fadeOut.start();

      setTimeout(() => {
        setShow(false);
      }, toastDuration);
    }, toastDuration);

    // Clean up the timeout and animation when the component unmounts
    return () => {
      clearTimeout(timeout);
      fadeOut.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Only render the toast if there is an error
  if (!descriptionError) {
    return null;
  }

  return (
    show && (
      <Animated.View
        style={[
          styles.container,
          // eslint-disable-next-line react-native/no-inline-styles
          {
            opacity: fadeAnim,
            top: topPercentage,
            borderColor: dataVoid ? '#fffffe' : colors.danger,
          },
        ]}>
        <View style={styles.subContainer}>
          <Icon
            name="error-outline"
            size={24}
            color={dataVoid ? '#d1da24' : colors.danger}
            style={styles.checkPopup}
          />
          <Text style={styles.descriptionMessage}>{descriptionError}</Text>
        </View>
      </Animated.View>
    )
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

export default ToastRequest;
