/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import React, {useCallback, useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  FormControl,
  VStack,
  Text,
  InputField,
  Input,
  InputIcon,
  InputSlot,
  Button,
  ButtonText,
  EyeIcon,
  EyeOffIcon,
} from '@gluestack-ui/themed';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Alert,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ErrorType, useAuth} from './../../contexts/authContext';

import {MainNavigatorParamList} from '@/navigators/main-navigator';
import CustomBackButton from '@/components/BottomCustom/CustomBackButton';
import {SpinnerLogin} from '@/components/Spinner-login';
import {colors} from '@/config/theme';
import {useOneSignal} from '@/contexts/oneSignalContext';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  MainNavigatorParamList,
  'screens.login'
>;

function LoginScreen() {
  const {fetchPlayerId} = useOneSignal();
  const isFocused = useIsFocused();

  const [showPassword, setShowPassword] = useState(false);
  const [isFocusUser, setIsFocusUser] = useState(false);
  const [isFocusPassword, setIsFocusPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {accessToken, currentUser, error: authError, logInUser} = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const navigation = useNavigation<LoginScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const handleState = () => {
    setShowPassword(showState => !showState);
  };

  const goToLogin = () => {
    navigation.navigate('screens.signup');
  };

  const onSubmit = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    if (!email || !password) {
      Alert.alert('Error', 'Los campos no deben estar vacíos.');
      setLoading(false);
      console.log('Error: Please fill in both email and password.');
      return;
    }
    await logInUser(email, password);
  };

  const onForgotPasswordButtonPress = () => {
    navigation.navigate('screens.forgotPassword');
  };

  const navigationHome = async () => {
    if (accessToken && currentUser) {
      navigation.navigate('navigator.tabs');
      setLoading(false);
      setEmail('');
      setPassword('');
      // La actualización del notificationId se hace automáticamente en el contexto de OneSignal
      // cuando cambian playerId o accessToken, pero obtenemos el ID aquí como respaldo
      const idUserNotification = await fetchPlayerId();
      if (idUserNotification) {
        console.log('📱 OneSignal ID obtenido (actualización automática en progreso)');
      }
    }
  };

  useEffect(() => {
    if (isFocused) {
      navigationHome();
    }
  }, [accessToken, currentUser, loading]);

  useFocusEffect(
    useCallback(() => {
      if (authError && authError.error !== '') {
        let title = '';
        switch (authError.type) {
          case ErrorType.NO_AUTHORIZED:
            title = 'No Autorizado';
            break;
          case ErrorType.USER_NOT_FOUND_IN_DB:
          case ErrorType.INTERNAL_SERVER:
            title = 'Error de servidor';
            break;
          default:
          case ErrorType.DEFAULT:
            title = 'Error';
            break;
        }
        Alert.alert(title, authError.error);
        setLoading(false);
      }
    }, [authError]),
  );

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
      <CustomBackButton textBack={'Regresar'} textCenter={''} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView 
          contentContainerStyle={{flexGrow: 1}}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <FormControl
              px={15}
              py={30}
              $dark-borderWidth="$1"
              $dark-borderRadius="$lg"
              $dark-borderColor="$borderDark800">
              <VStack space="xl">
                <View style={styles.headerContainer}>
                  <View>
                    <Text style={styles.headerText} bold>
                      Inicia Sesión
                    </Text>
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <VStack space="xs" mb={18}>
                    <Text style={styles.labelText}>Correo</Text>
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
                        onChangeText={Text => setEmail(Text)}
                        value={email}
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
                  <VStack space="xs" mb={10}>
                    <Text style={styles.labelText}>Contraseña</Text>
                    <Input
                      style={[
                        styles.input,
                        {
                          borderColor: isFocusPassword
                            ? colors.primary
                            : 'transparent',
                        },
                      ]}>
                      <InputField
                        onChangeText={Text => setPassword(Text)}
                        value={password}
                        type={showPassword ? 'text' : 'password'}
                        style={[
                          styles.inputField,
                          {
                            backgroundColor: isFocusPassword
                              ? '#FFFFFF'
                              : colors.neutral100,
                          },
                        ]}
                        onFocus={() => setIsFocusPassword(true)}
                        onBlur={() => setIsFocusPassword(false)}
                        placeholder="Tu contraseña"
                        placeholderTextColor={colors.neutral400}
                      />
                      <InputSlot
                        pr="$3"
                        onPress={handleState}
                        style={[
                          styles.inputSlot,
                          {
                            backgroundColor: isFocusPassword
                              ? '#FFFFFF'
                              : colors.neutral100,
                          },
                        ]}>
                        <InputIcon
                          as={showPassword ? EyeIcon : EyeOffIcon}
                          color="#00000099"
                        />
                      </InputSlot>
                    </Input>
                    <Pressable onPress={onForgotPasswordButtonPress}>
                      <Text style={styles.forgotPasswordText}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </Pressable>
                  </VStack>
                  <Button onPress={onSubmit} style={[styles.submitButton]}>
                    <ButtonText bold style={styles.submitBtnText}>
                      {loading ? <SpinnerLogin /> : 'Siguiente'}
                    </ButtonText>
                  </Button>
                </View>
              </VStack>
            </FormControl>
          </TouchableWithoutFeedback>
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>¿No tienes una cuenta?</Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text bold style={styles.signUpText}>
                Regístrate
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.neutral800,
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
  inputSlot: {
    backgroundColor: colors.neutral100,
  },
  forgotPasswordText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '400',
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
  footerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerText: {
    color: colors.neutral800,
    gap: 10,
  },
  signUpText: {
    color: '#2D4C75',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
