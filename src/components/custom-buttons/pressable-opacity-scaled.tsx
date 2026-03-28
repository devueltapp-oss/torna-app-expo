import PressableOpacity, {PressableOpacityProps} from './pressable-opacity';

type PressableOpacityScaledProps = PressableOpacityProps & {
  scale?: number;
  pressedScale?: number;
};

function PressableOpacityScaled({
  onPress,
  children,
  style = _ => ({}),
  scale = 1,
  pressedScale = 0.95,
  containerStyle,
}: PressableOpacityScaledProps) {
  return (
    <PressableOpacity
      onPress={onPress}
      containerStyle={containerStyle}
      style={pressed => {
        const styles = style(pressed);

        return [
          {
            transform: [
              {scaleX: pressed ? pressedScale : scale},
              {scaleY: pressed ? pressedScale : scale},
            ],
          },
          styles,
        ];
      }}>
      {children}
    </PressableOpacity>
  );
}

export default PressableOpacityScaled;
