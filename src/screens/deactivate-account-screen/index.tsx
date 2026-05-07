import {useState} from 'react';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import {
  Button,
  ButtonText,
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
import {deleteCurrentUser} from '@/api/users';
import {logOut} from '@/firebase/auth';

type Props = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.deactivateAccount'
>;

const DeactivateAccountScreen = ({navigation}: Props) => {
  const {getAccessToken} = useAuth();
  const insets = useSafeAreaInsets();

  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<{error: any} | null>(null);

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
    setRequestError(null);
    setSubmitting(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw {response: {status: 401}};
      }

      await deleteCurrentUser(token);

      Alert.alert(
        'Cuenta eliminada',
        'Tu cuenta ha sido eliminada permanentemente.',
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
        textCenter="Eliminar cuenta"
        showNotificationIcon={false}
        showProfileIcon={false}
        customGoBack={handleGoBack}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {requestError && (
            <ToastRequest status={requestError} topPercentage={'85%'} />
          )}
          <VStack space="lg">
            <Text style={styles.title} bold>
              Eliminar cuenta permanentemente
            </Text>
            <Text style={styles.description}>
              Esta acción es permanente e irreversible. Tu cuenta y todos tus
              datos serán eliminados definitivamente.
            </Text>

            <VStack space="md" style={styles.buttonsContainer}>
              <Button
                disabled={submitting}
                style={[styles.buttonPrimary, submitting && styles.buttonDisabled]}
                onPress={handleSubmit}>
                <ButtonText bold>
                  {submitting ? <SpinnerLogin /> : 'Eliminar cuenta'}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
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
  buttonsContainer: {
    marginTop: 12,
  },
  buttonPrimary: {
    backgroundColor: colors.danger,
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

