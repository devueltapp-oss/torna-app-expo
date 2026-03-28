import React from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {useColorScheme} from 'react-native';

interface SpinnerProps {
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  showText?: boolean;
  color?: string;
}

const CustomActivityIndicator = ({
  textStyle,
  containerStyle,
  showText = true,
  color,
}: SpinnerProps) => {
  const colorScheme = useColorScheme();
  const indicatorColor =
    color ?? (colorScheme === 'dark' ? '#primary400' : 'blue');
  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator color={indicatorColor} />
      {showText && <Text style={[styles.text, textStyle]}>Cargando...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    marginBottom: '-12%',
  },
  text: {
    marginLeft: 10,
    fontSize: 16,
    color: '#0F172A',
  },
});

export default CustomActivityIndicator;
