import {
  ImageBackground,
  StyleSheet,
  View,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {Text} from '@gluestack-ui/themed';

import {PressableOpacityScaled} from '../custom-buttons';

import {colors} from '@/config/theme';

type LocationButtonProps = {
  image: string;
  name: string;
  onPress?: ((event: GestureResponderEvent) => void) | null | undefined;
  style?: StyleProp<ViewStyle>;
};

function LocationButton({image, name, onPress, style}: LocationButtonProps) {
  return (
    <PressableOpacityScaled onPress={onPress}>
      <ImageBackground
        source={{uri: image}}
        imageStyle={styles.image}
        style={[styles.container, style]}>
        <View style={styles.textContainer}>
          <Text style={styles.text} bold>
            {name}
          </Text>
        </View>
      </ImageBackground>
    </PressableOpacityScaled>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: 10,
  },
  textContainer: {
    backgroundColor: colors.secondary,
    padding: 10,
    borderRadius: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary900,
  },
});

export default LocationButton;
