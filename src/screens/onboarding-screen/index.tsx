import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {ButtonGroup, Button, ButtonText} from '@gluestack-ui/themed';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import styles from './styles';

import {colors} from '@/config/theme';
import {MainNavigatorParamList} from '@/navigators/main-navigator';

export type OnboardingScreenNavigationProp = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.onboarding'
>;

function OnBoardingScreen({navigation}: OnboardingScreenNavigationProp) {
  const handleSignIn = () => {
    navigation.navigate('screens.login');
  };

  const handleSignUp = () => {
    navigation.navigate('screens.signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text size="5xl" fontWeight="bold" color={colors.secondary}>
              TORNA
            </Text>
            <Text color={colors.secondary}>Tu partida a tu modo</Text>
          </View>
          <View style={styles.footer}>
            <ButtonGroup space="2xl">
              <Button flex={1} bgColor={colors.primary} onPress={handleSignIn}>
                <ButtonText>Iniciar Sesión</ButtonText>
              </Button>
              <Button flex={1} bgColor="#FFFF" onPress={handleSignUp}>
                <ButtonText color="$black">Registrate</ButtonText>
              </Button>
            </ButtonGroup>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default OnBoardingScreen;
