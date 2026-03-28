import React from 'react';
import { PressableOpacityScaled } from '@/components/custom-buttons';
import { Text, StyleSheet, View } from 'react-native';
import { Spinner } from '@/components/Spinner';
import { colors } from '@/config/theme';

interface GenerateClipButtonProps {
  onPress: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export const GenerateClipButton: React.FC<GenerateClipButtonProps> = ({
  onPress,
  disabled,
  isLoading,
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <PressableOpacityScaled
      onPress={isDisabled ? undefined : onPress}
      containerStyle={[
        styles.button,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.spinnerWrapper}>
            <Spinner showText={false} />
          </View>
          <Text style={styles.buttonText}>Generando...</Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>Generar Clip</Text>
      )}
    </PressableOpacityScaled>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary || '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral400 || '#94A3B8',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinnerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 20, // Altura fija para alinear mejor
  },
});
