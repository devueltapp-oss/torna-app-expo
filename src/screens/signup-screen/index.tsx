/* eslint-disable react-native/no-inline-styles */
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  NativeSyntheticEvent,
  TextInputFocusEventData,
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
import {useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import * as yup from 'yup';
import {Formik} from 'formik';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {MainNavigatorParamList} from '@/navigators/main-navigator';
import Check from '@/assets/icons/check-icon';
import Mistage from '@/assets/icons/mistage-icon';
import CustomHeader from '@/components/header/CustomHeader';
import { colors } from "@/config/theme";

// import {tokenLogin} from '@/store/tokenLogin';

interface FormData {
  email: string;
  user: string;
  password: string;
  confirmPassword: string;
}

// const  dataUser  = tokenLogin(state => state.setDataUser) //Para recibir el array de datos
// const  tokenUser = tokenLogin(state => state.setToken) //Para recibir  el token

type LoginScreenNavigationProp = NativeStackNavigationProp<
  MainNavigatorParamList,
  'screens.signup'
>;

const registerValidationSchema = yup.object({
  user: yup.string().required('Usuario es requerido '),
  email: yup
    .string()
    .email('Por favor introduce un email valido')
    .required('Email es requerido'),
  password: yup
    .string()
    .required('Contraseña es requerida')
    .min(
      8,
      ({min}) =>
        `Contraseña debe de tener un mínimo de ${min} caracteres una mayúscula, una minúscula, un número y un carácter especial`,
    )
    .matches(
      /[0-9]/,
      ' "Contraseña debe de tener un mínimo de 8 caracteres una mayúscula, una minúscula, un número y un carácter especial"',
    )
    .matches(
      /[a-z]/,
      ' "Contraseña debe de tener un mínimo de 8 caracteres una mayúscula, una minúscula, un número y un carácter especial"',
    )
    .matches(
      /[A-Z]/,
      ' "Contraseña debe de tener un mínimo de 8 caracteres una mayúscula, una minúscula, un número y un carácter especial"',
    )
    .matches(
      /[^\w]/,
      ' "Contraseña debe de tener un mínimo de 8 caracteres una mayúscula, una minúscula, un número y un carácter especial"',
    ),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas deben coincidir')
    .required('La confirmación de la contraseña es requerida'),
});

function SignUpScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFocusUser, setIsFocusUser] = useState(false);
  const [isFocusEmail, setIsFocusEmail] = useState(false);
  const [isFocusPassword, setIsFocusPassword] = useState(false);
  const [isFocusConfirmPassword, setIsFocusConfirmPassword] = useState(false);

  const insets = useSafeAreaInsets();

  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleStatePassword = () => {
    setShowPassword(showState => {
      return !showState;
    });
  };

  const handleStateConfirmPassword = () => {
    setShowConfirmPassword(showState => {
      return !showState;
    });
  };

  const goToLogin = () => {
    navigation.navigate('screens.login');
  };

  const handleGoBack = () => {
    // Si hay una pantalla anterior en el stack, ir hacia atrás
    // Si no, navegar a onboarding
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('screens.onboarding');
    }
  };

  const handleOnSubmit = async (values: FormData) => {
    const {email, password, user} = values;
    navigation.navigate('screens.signupPersonalData', {
      email,
      password,
      username: user,
    });
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
      <CustomHeader
        boolImageTorna={false}
        textCenter={'Registro'}
        showNotificationIcon={false}
        showProfileIcon={false}
        textBack={'Regresar'}
        customGoBack={handleGoBack}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{flexGrow: 1}}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <Text style={styles.titleRegister} bold>
                Crea tu cuenta
              </Text>
              <Formik
                initialValues={{
                  email: '',
                  user: '',
                  password: '',
                  confirmPassword: '',
                }}
                validateOnMount={true}
                validationSchema={registerValidationSchema}
                onSubmit={handleOnSubmit}>
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
                  // isValid,
                  touched,
                  errors,
                }) => (
                  <FormControl
                    px={46}
                    py={72}
                    $dark-borderWidth="$1"
                    $dark-borderRadius="$lg"
                    $dark-borderColor="$">
                    <VStack space="xl">
                      <VStack space="xs">
                        <Text style={styles.textInput}>Correo Electronico</Text>
                        <Input
                          style={[
                            styles.input,
                            {
                              borderColor: isFocusEmail
                                ? colors.primary
                                : touched.email && errors.email
                                ? colors.danger
                                : touched.email && !errors.email
                                ? 'green'
                                : 'transparent',
                            },
                          ]}>
                          <InputField
                            type="text"
                            placeholder="Tu correo electrónico"
                            placeholderTextColor={colors.neutral400}
                            style={{
                              backgroundColor: isFocusEmail
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}
                            onFocus={() => setIsFocusEmail(true)}
                            onBlur={(
                              e: NativeSyntheticEvent<TextInputFocusEventData>,
                            ) => {
                              setIsFocusEmail(false);
                              handleBlur('email')(e);
                            }}
                            onChangeText={handleChange('email')}
                            value={values.email}
                          />

                          {touched.email && !errors.email && (
                            <Check style={styles.styleIcon} />
                          )}

                          {errors.email && touched.email && (
                            <Mistage style={styles.styleIcon} />
                          )}
                        </Input>
                        {errors.email && touched.email && (
                          <Text style={styles.textErrors}>{errors.email}</Text>
                        )}
                      </VStack>
                      <VStack space="xs">
                        <Text style={styles.textInput}>Usuario</Text>
                        <Input
                          style={[
                            styles.input,
                            {
                              borderColor: isFocusUser
                                ? colors.primary
                                : touched.user && errors.user
                                ? colors.danger
                                : touched.user && !errors.user
                                ? 'green'
                                : 'transparent',
                            },
                          ]}>
                          <InputField
                            type="text"
                            placeholder="Tu nombre de usuario"
                            placeholderTextColor={colors.neutral400}
                            style={{
                              backgroundColor: isFocusUser
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}
                            onFocus={() => setIsFocusUser(true)}
                            onBlur={(
                              e: NativeSyntheticEvent<TextInputFocusEventData>,
                            ) => {
                              setIsFocusUser(false);
                              handleBlur('user')(e);
                            }}
                            onChangeText={handleChange('user')}
                            value={values.user}
                          />

                          {touched.user && !errors.user && (
                            <Check style={styles.styleIcon} />
                          )}

                          {errors.user && touched.user && (
                            <Mistage style={styles.styleIcon} />
                          )}
                        </Input>
                        {errors.user && touched.user && (
                          <Text style={styles.textErrors}>{errors.user}</Text>
                        )}
                      </VStack>
                      <VStack space="xs">
                        <Text style={styles.textInput}>Contraseña</Text>
                        <Input
                          style={[
                            styles.input,
                            {
                              borderColor: isFocusPassword
                                ? colors.primary
                                : touched.password && errors.password
                                ? colors.danger
                                : touched.password && !errors.password
                                ? 'green'
                                : 'transparent',
                            },
                          ]}>
                          <InputField
                            placeholderTextColor={colors.neutral400}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Elige una contraseña"
                            style={{
                              backgroundColor: isFocusPassword
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}
                            onFocus={() => setIsFocusPassword(true)}
                            onBlur={(
                              e: NativeSyntheticEvent<TextInputFocusEventData>,
                            ) => {
                              setIsFocusPassword(false);
                              handleBlur('password')(e);
                            }}
                            onChangeText={handleChange('password')}
                            value={values.password}
                          />
                          {touched.password && !errors.password && (
                            <Check style={styles.styleIcon2} />
                          )}

                          {errors.password && touched.password && (
                            <Mistage style={styles.styleIcon2} />
                          )}

                          <InputSlot
                            pr="$3"
                            onPress={handleStatePassword}
                            style={{
                              backgroundColor: isFocusPassword
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}>
                            {/* EyeIcon, EyeOffIcon are both imported from 'lucide-react-native' */}
                            <InputIcon
                              as={showPassword ? EyeIcon : EyeOffIcon}
                              color="#00000099"
                            />
                          </InputSlot>
                        </Input>
                        {errors.password && touched.password && (
                          <Text style={styles.textErrors}>
                            {errors.password}
                          </Text>
                        )}
                      </VStack>
                      <VStack space="xs">
                        <Text style={styles.textInput}>
                          Confirmar contraseña
                        </Text>
                        <Input
                          style={[
                            styles.input,
                            {
                              borderColor: isFocusConfirmPassword
                                ? colors.primary
                                : touched.confirmPassword &&
                                  errors.confirmPassword
                                ? colors.danger
                                : touched.confirmPassword &&
                                  !errors.confirmPassword
                                ? 'green'
                                : 'transparent',
                            },
                          ]}>
                          <InputField
                            placeholderTextColor={colors.neutral400}
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repite la contraseña"
                            style={{
                              backgroundColor: isFocusConfirmPassword
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}
                            onFocus={() => setIsFocusConfirmPassword(true)}
                            onBlur={(
                              e: NativeSyntheticEvent<TextInputFocusEventData>,
                            ) => {
                              setIsFocusConfirmPassword(false);
                              handleBlur('confirmPassword')(e);
                            }}
                            onChangeText={handleChange('confirmPassword')}
                            value={values.confirmPassword}
                          />
                          <InputSlot
                            pr="$3"
                            onPress={handleStateConfirmPassword}
                            style={{
                              backgroundColor: isFocusConfirmPassword
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}>
                            {/* EyeIcon, EyeOffIcon are both imported from 'lucide-react-native' */}
                            <InputIcon
                              as={showConfirmPassword ? EyeIcon : EyeOffIcon}
                              color="#00000099"
                            />
                          </InputSlot>
                          {touched.confirmPassword &&
                            !errors.confirmPassword && (
                              <Check style={styles.styleIcon2} />
                            )}

                          {errors.confirmPassword &&
                            touched.confirmPassword && (
                              <Mistage style={styles.styleIcon2} />
                            )}
                        </Input>
                        {errors.confirmPassword && touched.confirmPassword && (
                          <Text style={styles.textErrors}>
                            {errors.confirmPassword}
                          </Text>
                        )}
                      </VStack>
                      <VStack space="xs">
                        <Button
                          style={styles.buttonNext}
                          onPress={() => handleSubmit()}>
                          <ButtonText bold color="$white">Siguiente</ButtonText>
                        </Button>
                      </VStack>
                    </VStack>
                  </FormControl>
                )}
              </Formik>
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.containerTitleRedirectToLogin}>
            <Text style={styles.titleLogin}> ¿Ya tienes una cuenta? 
            <TouchableOpacity onPress={() => goToLogin()}>
              <Text bold style={styles.titleRedirectToLogin}>Iniciar sesión</Text>
            </TouchableOpacity>
            </Text>
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
  titleRegister: {
    fontSize: 26,
    color: '#0F172A',
    textAlign: 'center',
    transform: [{translateY: 25}],
  },
  textInput: {
    color: colors.neutral800,
    lineHeight: 16.1,
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 3,
  },
  textErrors: {
    color: colors.danger,
  },
  styleIcon: {
    alignSelf: 'center',
    position: 'absolute',
    left: '90%',
  },
  styleIcon2: {
    alignSelf: 'center',
    position: 'absolute',
    left: '85%',
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderRadius: 9,
  },
  buttonNext: {
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  containerTitleRedirectToLogin: {
    flex: 1,
    justifyContent: 'flex-end',
    marginVertical: 40,
    transform: [{translateY: -45}],
    alignItems: 'center',
  },
  titleLogin: {
    color: '#1E293B',
    position: 'absolute',
    bottom: 0,
    fontSize: 16,
  },
  titleRedirectToLogin: {
    color: colors.primary,
    textDecorationLine: 'underline',
    transform: [{translateX: 10}, {translateY: 4}],
  },
});

export default SignUpScreen;
