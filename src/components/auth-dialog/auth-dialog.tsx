import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  Heading,
  AlertDialogCloseButton,
  AlertDialogBody,
  AlertDialogFooter,
  Icon,
  Text,
  CloseIcon,
  ButtonGroup,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import {useNavigation} from '@react-navigation/native';

import useAuthDialog from './useAuthDialog';

import {Screens} from '@/config/screens';

function AuthDialog() {
  const {toggle, show} = useAuthDialog();
  const navigation = useNavigation<any>();

  const handleGoToOnboarding = () => {
    toggle();
    navigation.navigate(Screens.Onboarding);
  };

  return (
    <AlertDialog isOpen={show} onClose={toggle}>
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogHeader>
          <Heading size="lg">Debes iniciar sesión</Heading>
          <AlertDialogCloseButton>
            <Icon as={CloseIcon} />
          </AlertDialogCloseButton>
        </AlertDialogHeader>
        <AlertDialogBody>
          <Text size="sm">
            Inicia sesión o regístrate para unirte a una comunidad vibrante y
            dinámica, tu partida a tu modo!
          </Text>
        </AlertDialogBody>
        <AlertDialogFooter>
          <ButtonGroup space="lg">
            <Button
              variant="outline"
              action="secondary"
              onPress={handleGoToOnboarding}>
              <ButtonText>Vamos!</ButtonText>
            </Button>
            <Button bg="$error600" action="negative" onPress={toggle}>
              <ButtonText>Ahora no</ButtonText>
            </Button>
          </ButtonGroup>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AuthDialog;
