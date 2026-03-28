import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, ButtonText} from '@gluestack-ui/themed';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';

import {gluestackUIConfig} from '../../../config/gluestack-ui.config';

import {MainNavigatorParamList} from '@/navigators/main-navigator';

function SendedEmailForgotPasswordScreen({
  navigation,
}: NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.sendedEmailForgotPassword'
>) {
  const goToLogin = () => {
    navigation.navigate('screens.login');
  };

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.headerContainer}>
        <Text style={[styles.titleText, styles.textCenter]}>
          Revisa tu bandeja de entrada
        </Text>
        <Text style={styles.textCenter}>
          Se ha enviado un correo con el enlace para que puedas recuperar tu
          contraseña
        </Text>
      </View>
      <Button onPress={goToLogin} style={styles.submitButton}>
        <ButtonText color="$white">Volver al inicio de sesión</ButtonText>
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  titleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: gluestackUIConfig.tokens.colors.blueGray800,
  },
  submitButton: {
    height: 55,
    borderRadius: 8,
    marginTop: 14,
  },
});

export default SendedEmailForgotPasswordScreen;
