/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-native/no-inline-styles */
import {
  VStack,
  Input,
  InputField,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import {useState} from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {MainNavigatorParamList} from '@/navigators/main-navigator';
import CustomBackButton from '@/components/BottomCustom/CustomBackButton';
import {sendPasswordResetEmail} from '@/firebase/auth';
import ToastRequest from '@/components/toast';
import {SpinnerLogin} from '@/components/Spinner-login';
import { colors } from '@/config/theme';

function ForgotPasswordScreen(
  props: NativeStackScreenProps<
    MainNavigatorParamList,
    'screens.forgotPassword'
  >,
) {
  const [email, setEmail] = useState('');
  const [isFocusUser, setIsFocusUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typeStatusError, setTypeStatusErr] = useState<any>(null);
  const insets = useSafeAreaInsets();

  const setTypeStatusError = (error: any) => {
    setTypeStatusErr({error});
  };

  const onSubmit = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      props.navigation.navigate('screens.sendedEmailForgotPassword');
    } catch (error: any) {
      if (error.message === '[auth/invalid-email] The email address is badly formatted.'){
        setTypeStatusError('La dirección de correo electrónico está mal formateada');
        return;
      }
      if (error.message === '[auth/network-request-failed] A network error (such as timeout, interrupted connection or unreachable host) has occurred.'){
        setTypeStatusError('Se ha producido un error de red');
        return;
      } else {
        setTypeStatusError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const containerStyles = {
    flex: 1,
    backgroundColor: 'white',
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <SafeAreaView style={containerStyles}>
      {true && <ToastRequest status={typeStatusError} topPercentage={'85%'} />}
      <CustomBackButton textBack={'Regresar'} textCenter={''} />
      <View style={styles.contentContainer}>
        <VStack space="xl">
          <View style={styles.headerContainer}>
            <View>
              <Text style={styles.headerText}>Recupera tu contraseña</Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <VStack space="xs" mb={18}>
              <Text style={styles.labelText}>Correo electrónico</Text>
              <Input
                style={[
                  styles.input,
                  {
                    borderColor: isFocusUser
                      ? colors.primary
                      : 'transparent',
                  },
                ]}>
                <InputField
                  onChangeText={text => setEmail(text)}
                  type="text"
                  placeholder="Tu correo electrónico"
                  placeholderTextColor={colors.neutral400}
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: isFocusUser
                        ? '#FFFFFF'
                        : colors.neutral100,
                    },
                  ]}
                  onFocus={() => setIsFocusUser(true)}
                  onBlur={() => setIsFocusUser(false)}
                />
              </Input>
            </VStack>
            <Text style={styles.labelText}>
              Te llegará un enlace de recuperación de contraseña al correo que
              hayas ingresado
            </Text>
            <Button onPress={onSubmit} style={styles.submitButton}>
              <ButtonText bold style={styles.submitBtnText}>
                {loading ? <SpinnerLogin /> : 'Siguiente'}
              </ButtonText>
            </Button>
          </View>
        </VStack>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  inputContainer: {
    height: 450,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 22,
    margin: 0,
  },
  labelText: {
    color: colors.neutral800,
    lineHeight: 16.1,
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 3,
  },
  input: {
    borderWidth: 2,
    borderRadius: 8,
    height: 50,
  },
  inputField: {
    backgroundColor: colors.neutral100,
  },
  submitButton: {
    height: 55,
    borderRadius: 8,
    marginTop: 14,
  },
  submitBtnText: {
    fontWeight: '100',
    color: colors.white,
  },
});

export default ForgotPasswordScreen;
