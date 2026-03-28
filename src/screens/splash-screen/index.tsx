import React, {useEffect} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@/contexts/authContext';

const {width, height} = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const {firebaseUser} = useAuth();

  useEffect(() => {
    // Simular tiempo de carga (2 segundos)
    const timer = setTimeout(() => {
      // Navegar según el estado de autenticación
      if (firebaseUser) {
        // Usuario autenticado, ir a la app principal
        navigation.replace('navigator.tabs' as never);
      } else {
        // Usuario no autenticado, ir a onboarding/login
        navigation.replace('screens.onboarding' as never);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, firebaseUser]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Logo centrado */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/bootsplash/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          alt="Logotipo de Torna"
        />
      </View>

      {/* Texto opcional */}
      <View style={styles.textContainer}>
        {/* Puedes agregar texto aquí si quieres */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fondo blanco
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%', // Asegurar que ocupe todo el ancho
    paddingTop: height * 0.1, // Empujar el logo un poco hacia abajo
  },
  logo: {
    width: width * 0.5, // 50% del ancho de la pantalla (más pequeño para mejor calidad)
    height: width * 0.5 * 0.6, // Mantener proporción
    maxWidth: 250,
    maxHeight: 150,
  },
  textContainer: {
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;
