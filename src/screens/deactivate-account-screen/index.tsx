import {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  ButtonText,
  Input,
  InputField,
  SafeAreaView,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import CustomHeader from '@/components/header/CustomHeader';
import ToastRequest from '@/components/toast';
import {SpinnerLogin} from '@/components/Spinner-login';
import {colors} from '@/config/theme';
import {useAuth} from '@/contexts/authContext';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import {deactivateCurrentUser} from '@/api/users';
import {logOut} from '@/firebase/auth';

type Props = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.deactivateAccount'
>;

const MAX_REASON_LENGTH = 500;

const DeactivateAccountScreen = ({navigation}: Props) => {
  const {getAccessToken} = useAuth();
  const insets = useSafeAreaInsets();

  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<{error: any} | null>(null);

  const trimmedReason = reason.trim();
  const hasValidationError = touched && trimmedReason.length === 0;

  const handleGoBack = () => {
    navigation.goBack();
  };

  const resetToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'screens.login'}],
    });
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (trimmedReason.length === 0) {
      return;
    }

    setRequestError(null);
    setSubmitting(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw {response: {status: 401}};
      }

      await deactivateCurrentUser(token, trimmedReason);

      Alert.alert(
        'Cuenta desactivada',
        'Tu cuenta ha sido desactivada correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: async () => {
              try {
                await logOut();
              } finally {
                resetToLogin();
              }
            },
          },
        ],
        {cancelable: false},
      );
    } catch (error: any) {
      const status = error?.response?.status ?? error?.message ?? error;
      setRequestError({error: status});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <CustomHeader
        boolImageTorna={false}
        textCenter="Darme de baja"
        showNotificationIcon={false}
        showProfileIcon={false}
        customGoBack={handleGoBack}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            {requestError && (
              <ToastRequest status={requestError} topPercentage={'85%'} />
            )}
            <VStack space="lg">
              <Text style={styles.title} bold>
                Confirmar baja de cuenta
              </Text>
              <Text style={styles.description}>
                Cuéntanos el motivo por el cual deseas darte de baja. Esta
                información nos ayuda a mejorar la experiencia.
              </Text>

              <VStack space="xs">
                <Text style={styles.label} bold>
                  Motivo (obligatorio)
                </Text>
                <Input style={styles.inputContainer}>
                  <InputField
                    style={styles.input}
                    value={reason}
                    onChangeText={text => {
                      setReason(text.slice(0, MAX_REASON_LENGTH));
                      setRequestError(null);
                    }}
                    onBlur={() => setTouched(true)}
                    multiline
                    placeholder="Escribe tu motivo aquí..."
                    placeholderTextColor={colors.neutral400}
                  />
                </Input>
                <View style={styles.helperRow}>
                  <Text style={styles.helperText}>
                    {reason.length}/{MAX_REASON_LENGTH}
                  </Text>
                  {hasValidationError && (
                    <Text style={styles.errorText}>El motivo es obligatorio.</Text>
                  )}
                </View>
              </VStack>

              <VStack space="md" style={styles.buttonsContainer}>
                <Button
                  disabled={submitting}
                  style={[styles.buttonPrimary, submitting && styles.buttonDisabled]}
                  onPress={handleSubmit}>
                  <ButtonText bold>
                    {submitting ? <SpinnerLogin /> : 'Confirmar baja'}
                  </ButtonText>
                </Button>

                <Button
                  variant="outline"
                  style={styles.buttonSecondary}
                  onPress={handleGoBack}
                  disabled={submitting}>
                  <ButtonText bold style={styles.buttonSecondaryText}>
                    Cancelar
                  </ButtonText>
                </Button>
              </VStack>
            </VStack>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 24,
    color: colors.dark,
  },
  description: {
    color: colors.neutral600,
    fontSize: 16,
    lineHeight: 22,
  },
  label: {
    color: colors.dark,
    fontSize: 16,
  },
  inputContainer: {
    borderColor: colors.neutral200,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 168,
    backgroundColor: colors.neutral100,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    textAlignVertical: 'top',
    color: colors.dark,
    minHeight: 168,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    color: colors.neutral500,
    fontSize: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  buttonsContainer: {
    marginTop: 12,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: colors.neutral50,
    borderColor: colors.neutral300,
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: colors.dark,
  },
});

export default DeactivateAccountScreen;

