import {Button, ButtonText} from '@gluestack-ui/themed';
import {
  Animated,
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {responsiveFontSize} from 'react-native-responsive-dimensions';

import {Spinner} from '../Spinner';

import {useFadeAnimation} from '@/animations';
import {colors} from '@/config/theme';

interface ButtonProps {
  text: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?: ((event: GestureResponderEvent) => void) | null | undefined;
  loading?: boolean;
}

export function LightButton({
  text,
  style,
  textStyle,
  onPress,
  loading = false,
}: ButtonProps) {
  const {fadeIn, fadeOut, opacityValue} = useFadeAnimation();
  return (
    <Animated.View style={{opacity: opacityValue}}>
      <Button
        bgColor={colors.neutral50}
        borderColor={colors.neutral200}
        borderWidth={1}
        style={[styles.button, style]}
        onPress={onPress}
        onPressIn={fadeIn}
        onPressOut={fadeOut}>
        <ButtonText
          style={[{fontSize: responsiveFontSize(1.64)}, textStyle]}
          bold
          color={colors.dark}>
          {loading ? <Spinner showText={false} color={colors.primary} /> : text}
        </ButtonText>
      </Button>
    </Animated.View>
  );
}

export function DarkButton({
  text,
  style,
  textStyle,
  onPress,
  loading = false,
}: ButtonProps) {
  const {fadeIn, fadeOut, opacityValue} = useFadeAnimation();
  return (
    <Animated.View style={{opacity: opacityValue}}>
      <Button
        style={[styles.button, style]}
        onPress={onPress}
        onPressIn={fadeIn}
        onPressOut={fadeOut}>
        <ButtonText bold style={[styles.ButtonText, textStyle]}>
          {loading ? (
            <Spinner showText={false} color={colors.blueGray100} />
          ) : (
            text
          )}
        </ButtonText>
      </Button>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderColor: colors.neutral400,
    borderWidth: 1,
  },
  ButtonText: {
    fontSize: responsiveFontSize(1.64),
    fontWeight: 'bold',
  },
});
