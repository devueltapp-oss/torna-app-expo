import {Dimensions} from 'react-native';

export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SCREEN_WIDTH = Dimensions.get('window').width;

export const MAX_PROFILE_PICTURE_WIDTH = 1080;
export const MAX_PROFILE_PICTURE_HEIGHT = 1080;
// expo-image-picker quality is a number 0–1, same as react-native-image-picker PhotoQuality
export const PROFILE_PICTURE_QUALITY: number = 0.7;

export const SCREEN_HEIGHT_FOCUS_BOTTOM = SCREEN_HEIGHT - SCREEN_HEIGHT * 0.25;
export const SCREEN_HEIGHT_FOCUS_TOP =
  SCREEN_HEIGHT - SCREEN_HEIGHT_FOCUS_BOTTOM;

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Log para verificar la URL del backend (solo en desarrollo)
if (__DEV__) {
  console.log('[CONFIG] API_URL cargada desde .env:', API_URL);
}
