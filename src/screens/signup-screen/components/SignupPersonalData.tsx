/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useState} from 'react';
import {
  Keyboard,
  SafeAreaView,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  FormControl,
  VStack,
  Text,
  InputField,
  Input,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import * as yup from 'yup';
import {Formik} from 'formik';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {MainNavigatorParamList} from '@/navigators/main-navigator';
import ToastRequest from '@/components/toast';
import Check from '@/assets/icons/check-icon';
import Mistage from '@/assets/icons/mistage-icon';
import CustomHeader from '@/components/header/CustomHeader';
import {SpinnerLogin} from '@/components/Spinner-login';
import {colors} from '@/config/theme';
import {useAuth} from '@/contexts/authContext';
import {deleteCurrentUser} from '@/firebase/auth';

type SignupPersonalDataProp = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.signupPersonalData'
>;

interface FormData {
  firstNameLastname: string;
}

const validationSchema = yup.object({
  firstNameLastname: yup
    .string()
    .required('Nombre completo es requerido')
    .min(4, ({min}) => `Debe tener mínimo ${min} caracteres`),
  // phone: yup
  //   .string()
  //   .required('Teléfono es requerido')
  //   .matches(/^[0-9]+$/, 'El teléfono debe contener solo números'),
  // region: yup
  //   .string()
  //   .required('Región es requerida')
  //   .min(4, ({ min }) => `Debe tener mínimo ${min} caracteres`),
});

function SignupPersonalData(props: SignupPersonalDataProp) {
  const {signUpUser} = useAuth();
  const [typeStatusError, setTypeStatusError] = useState<any>(null);
  const [firstNameLastname, setfirstNameLastname] = useState(false);
  const [, setReload] = useState(false);
  const [load, setLoad] = useState(false);
  const insets = useSafeAreaInsets();
  // const [phone, setPhone] = useState(false);
  // const [region, setRegion] = useState(false);

  const handleOnSubmit = async (values: FormData) => {
    if (load) {
      return;
    }
    setLoad(true);
    const {email, password, username} = props.route.params;
    try {
      const res = await signUpUser(email, password, {
        username,
        name: values.firstNameLastname,
      });
      if (res) {
        props.navigation.navigate('screens.shipmentSuccesfull');
      }
    } catch (error: any) {
      switch (error) {
        case 'auth/email-already-in-use':
          setTypeStatusError({error: 'El email se encuentra en uso'});
          break;
        case 500:
          setTypeStatusError({
            error:
              'Ha ocurrido un error al registrar tu usuario, por favor registrate de nuevo',
          });
          deleteCurrentUser();
          props.navigation.navigate('screens.signup');
          break;
        default:
          setTypeStatusError({error});
          break;
      }

      console.log(error);
      handleReload();
    } finally {
      setLoad(false);
    }
  };

  const handleReload = () => {
    setReload(prev => !prev);
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
        textCenter="Registro"
        showNotificationIcon={false}
        showProfileIcon={false}
        textBack={'Regresar'}
      />
      {typeStatusError && (
        <ToastRequest status={typeStatusError} topPercentage={'76%'} />
      )}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{flexGrow: 1}}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <Text style={styles.titlePersonalInformation} bold>
                Datos Personales
              </Text>
              <Formik
                initialValues={{firstNameLastname: ''}}
                validationSchema={validationSchema}
                onSubmit={handleOnSubmit}>
                {({
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  values,
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
                        <Text style={styles.textInput}>Nombre y Apellido</Text>
                        <Input
                          style={[
                            styles.input,
                            {
                              borderColor: firstNameLastname
                                ? colors.primary
                                : touched.firstNameLastname &&
                                  errors.firstNameLastname
                                ? colors.danger
                                : touched.firstNameLastname &&
                                  !errors.firstNameLastname
                                ? 'green'
                                : 'transparent',
                            },
                          ]}>
                          <InputField
                            type="text"
                            placeholder="Tu nombre completo"
                            placeholderTextColor={colors.neutral400}
                            style={{
                              backgroundColor: firstNameLastname
                                ? '#FFFFFF'
                                : '#F1F5F9',
                            }}
                            onFocus={() => setfirstNameLastname(true)}
                            onBlur={(
                              e: NativeSyntheticEvent<TextInputFocusEventData>,
                            ) => {
                              setfirstNameLastname(false);
                              handleBlur('firstNameLastname')(e);
                            }}
                            onChangeText={handleChange('firstNameLastname')}
                            value={values.firstNameLastname}
                          />
                          {touched.firstNameLastname &&
                            !errors.firstNameLastname && (
                              <Check style={styles.styleIcon} />
                            )}

                          {errors.firstNameLastname &&
                            touched.firstNameLastname && (
                              <Mistage style={styles.styleIcon} />
                            )}
                        </Input>
                        {errors.firstNameLastname &&
                          touched.firstNameLastname && (
                            <Text style={styles.textErrors}>
                              {' '}
                              {errors.firstNameLastname}
                            </Text>
                          )}
                      </VStack>
                      <VStack space="xs">
                        <Button
                          style={styles.button}
                          onPress={() => {
                            handleSubmit();
                          }}>
                          <ButtonText bold color="$white">
                            {load ? <SpinnerLogin /> : 'Regístrate'}
                          </ButtonText>
                        </Button>
                      </VStack>
                    </VStack>
                  </FormControl>
                )}
              </Formik>
            </View>
          </TouchableWithoutFeedback>
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
  textInput: {
    color: '#1E293B',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 16.1,
  },
  textErrors: {
    color: colors.danger,
  },
  input: {
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  styleIcon: {
    width: 30,
    height: 15,
    alignSelf: 'center',
    position: 'absolute',
    left: '90%',
  },
  button: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#2D4C75',
  },
  titlePersonalInformation: {
    fontSize: 26,
    color: '#0F172A',
    textAlign: 'center',
    transform: [{translateY: 25}],
  },
});

export default SignupPersonalData;
