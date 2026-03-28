import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {responsiveFontSize} from 'react-native-responsive-dimensions';

import {colors} from '@/config/theme';

interface FullViewMessageProps {
  message: string;
  image?: ImageSourcePropType;
  imageAlt?: string;
  imageStyle?: StyleProp<ImageStyle>;
  fontSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

function FullViewMessage({
  message,
  image,
  imageAlt,
  imageStyle,
  fontSize = 2.5,
  containerStyle,
}: FullViewMessageProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {image && (
        <Image
          source={image}
          style={imageStyle}
          alt={imageAlt ?? `Ilustración: ${message}`}
        />
      )}
      <Text style={[styles.message, {fontSize: responsiveFontSize(fontSize)}]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  message: {
    color: colors.primary,
    fontWeight: 'normal',
    textAlign: 'center',
  },
});

export default FullViewMessage;
