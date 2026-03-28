/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-native/no-inline-styles */
import {
  Avatar,
  Button,
  ButtonText,
  Input,
  InputField,
  SafeAreaView,
  Text,
  VStack,
  View,
  Image,
} from '@gluestack-ui/themed';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useState, useEffect, useRef} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {type ExpoPickerResponse as ImagePickerResponse} from '@/components/custom-bottom-sheet/edit-profile-picture-bottom-sheet';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import {VENEZUELA_STATES, VenezuelaState} from '@/utils/venezuelaStates';

import {STRINGS} from '@/config/strings';
import {Screens} from '@/config/screens';
import {useAuth} from '@/contexts/authContext';
import {patchApiProfileData} from '@/api/EditProfile/PatchApiEditProfile';
import {getApiProfileData} from '@/api/Profile/GetAPiProfile';
import {Spinner} from '@/components/Spinner';
import {SpinnerLogin} from '@/components/Spinner-login';
import ToastRequest from '@/components/toast';
import {colors} from '@/config/theme';
import CustomHeader from '@/components/header/CustomHeader';
import AvatarImageDefault from '@/components/avatar-image-default';
import {PressableOpacityScaled} from '@/components/custom-buttons';
import {EditProfilePictureBottomSheet} from '@/components/custom-bottom-sheet/edit-profile-picture-bottom-sheet';
import {StateSelectorBottomSheet} from '@/components/custom-bottom-sheet/state-selector-bottom-sheet';
import {UserResponse} from '@/config/types';
import {apiCache} from '@/utils/apiCache';
import {useProfileRefresh} from '@/contexts/profileRefreshContext';
import {uploadImageToS3} from '@/utils/s3Upload';
import {FileType} from '@/api/Storage/GetPresignedUrl';

const EditProfileScreen = (props: NativeStackScreenProps<MainNavigatorParamList, 'screens.editProfile'>) => {
  const bottomSheet = useRef<BottomSheetModal>(null);
  const {setPopupShow, getAccessToken, firebaseUser, currentUser, refreshCurrentUser} = useAuth();
  const {triggerProfileRefresh} = useProfileRefresh();
  const ChangeAvatar = require('@/assets/utils/avatarChange.png');
  const [countLengthDescription, setCountLengthDescription] = useState(0);
  const [isFocusname, setIsFocusname] = useState(false);
  const [isUserLocation, setIsUserLocation] = useState(false);
  const [isFocusDescription, setIsFocusDescription] = useState(false);
  const [targename, setTargetName] = useState<string>('');
  const [targetUserAddress, setTargetAddress] = useState<string>('');
  const [targetDescription, setTargetDescription] = useState<string>('');
  const [selectedState, setSelectedState] = useState<VenezuelaState | null>(null);
  // Solo mostrar loading si no tenemos datos de navegación
  const [load, setLoad] = useState<boolean>(!props.route.params?.profileData);
  const [WaitingToSave, setWaitingToSave] = useState<boolean>(false);
  const [typeStatusError, setTypeStatusError] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [updatedPhoto, setUpdatedPhoto] = useState(false);
  const stateBottomSheet = useRef<BottomSheetModal>(null);

  const navigation = useNavigation();
  const handleUpdateProfile = async () => {
    if (WaitingToSave) {
      return;
    }
    const accessToken = await getAccessToken();
    try {
      setWaitingToSave(true);
      
      if (!currentUser?.username) {
        setTypeStatusError({
          error: 'Error: No se pudo obtener el username. Por favor, intenta de nuevo.',
        });
        return;
      }
      
      const data: any = {
        name: targename,
        address: selectedState?.value || targetUserAddress,
        description: targetDescription,
        username: currentUser.username,
      };
      
      if (updatedPhoto && profilePicture) {
        try {
          const s3Url = await uploadImageToS3(
            accessToken,
            profilePicture,
            FileType.PROFILE,
            'profile.jpg',
          );
          data.profilePicture = s3Url;
        } catch (uploadError) {
          console.error('Error subiendo foto a S3:', uploadError);
          setTypeStatusError({
            error: 'Error al subir la foto. Por favor, intenta de nuevo.',
          });
          return;
        }
      } else if (updatedPhoto && !profilePicture) {
        data.profilePicture = null;
      }
      
      await patchApiProfileData(accessToken, firebaseUser.uid, data);
      apiCache.delete(`profile_${firebaseUser.uid}`);
      await refreshCurrentUser();
      triggerProfileRefresh();
      setTypeStatusError(null);
      
    } catch (e: any) {
      console.error('Error updating profile:', e);
      setTypeStatusError({error: e});
    } finally {
      setWaitingToSave(false);
    }
  };

  const countDescription = (text: string) => {
    setCountLengthDescription(text.length);
  };

  const sendToProfile = () => {
    navigation.navigate(Screens.Profile as never);
  };

  const handleGoToDeactivateAccount = () => {
    navigation.navigate('screens.deactivateAccount' as never);
  };

  const updateDataUser = (data: UserResponse) => {
    setTargetName(data.name || '');
    setTargetAddress(data.address || '');
    setTargetDescription(data.description || '');
    setCountLengthDescription((data.description || '').length);
    setProfilePicture(data.profilePicture || null);
    
    // Establecer el estado seleccionado si existe
    if (data.address) {
      const state = VENEZUELA_STATES.find(s => s.value === data.address);
      setSelectedState(state || null);
    } else {
      setSelectedState(null);
    }
  };

  const insets = useSafeAreaInsets();
  const containerStyles = {
    flex: 1,
    backgroundColor: colors.background,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const apiGet = async () => {
    // Si tenemos datos del perfil pasados como parámetros, los usamos directamente
    if (props.route.params?.profileData) {
      updateDataUser(props.route.params.profileData);
      return;
    }

    // Solo hacer llamada API si no tenemos datos pasados como parámetros
    try {
      const accessToken = await getAccessToken();
      const resData = await getApiProfileData(accessToken);
      updateDataUser(resData);
    } catch (e) {
      console.error('Error fetching profile data:', e);
      setTypeStatusError({error: e});
    } finally {
      setLoad(false);
    }
  };

  const handleOnPressAvatar = () => {
    bottomSheet.current?.present();
  };

  const handleOnSelectPhoto = (data: ImagePickerResponse) => {
    if (data.errorMessage) {
      console.log(data.errorMessage);
    }
    if (data.assets && data.assets.length > 0 && data.assets[0].base64) {
      setUpdatedPhoto(true);
      const base64 = `data:${data.assets[0].type};base64,${data.assets[0].base64}`;
      setProfilePicture(base64);
    }
    bottomSheet.current?.dismiss();
  };

  const handleOnDeletePhoto = () => {
    setUpdatedPhoto(true);
    setProfilePicture(null);
    bottomSheet.current?.dismiss();
  };

  const handleSelectState = (state: VenezuelaState) => {
    setSelectedState(state);
    setTargetAddress(state.value);
    stateBottomSheet.current?.dismiss();
  };

  useEffect(() => {
    apiGet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={containerStyles}>
      <CustomHeader
        boolImageTorna={false}
        textCenter={'Editar perfil'}
        showNotificationIcon={false}
        showProfileIcon={false}
      />

      {load ? (
        <Spinner />
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {typeStatusError && (
            <ToastRequest status={typeStatusError} topPercentage={'76%'} />
          )}
          <ScrollView>
            <View style={{padding: 16}}>
              <VStack space="lg">
                <View style={styles.avatarPosition}>
                  <PressableOpacityScaled onPress={handleOnPressAvatar}>
                    <Avatar size="lg">
                      <AvatarImageDefault
                        fallbackText={currentUser?.name ?? 'Jugador'}
                        source={{uri: profilePicture || undefined}}
                        alt={'avatar'}
                      />
                      <View style={styles.containerChangeAvatar}>
                        <Image
                          source={ChangeAvatar}
                          style={styles.changeAvatar}
                          resizeMode="contain"
                          alt="changeAvatar"
                        />
                      </View>
                    </Avatar>
                  </PressableOpacityScaled>
                </View>
                <View style={styles.containerInputs}>
                  <VStack>
                    <Text style={styles.titleTextInput}>
                      {STRINGS.nameAndLastName}
                    </Text>
                    <Input
                      style={[
                        styles.input,
                        {
                          borderColor: isFocusname
                            ? colors.primary
                            : 'transparent',
                        },
                      ]}>
                      <InputField
                        style={styles.inputField}
                        placeholder="Nombre y Apellido"
                        placeholderTextColor={colors.neutral400}
                        onChange={e => setTargetName(e.nativeEvent.text)}
                        onFocus={() => setIsFocusname(true)}
                        onBlur={() => setIsFocusname(false)}
                        value={targename}
                      />
                    </Input>
                  </VStack>
                  <VStack>
                    <Text style={styles.titleTextInput}>Username</Text>
                    <Input
                      style={[
                        styles.input,
                        {
                          borderColor: 'transparent',
                          opacity: 0.6,
                        },
                      ]}>
                      <InputField
                        style={[styles.inputField, {color: colors.neutral600}]}
                        placeholder="Username"
                        placeholderTextColor={colors.neutral400}
                        value={currentUser?.username || ''}
                        editable={false}
                      />
                    </Input>
                    <Text style={styles.helpText}>
                      El username no se puede modificar
                    </Text>
                  </VStack>
                  <VStack>
                    <Text style={styles.titleTextInput}>
                      {STRINGS.description}
                    </Text>
                    <Input
                      style={[
                        styles.inputDescription,
                        {
                          borderColor: isFocusDescription
                            ? colors.primary
                            : 'transparent',
                        },
                      ]}>
                      <InputField
                        style={styles.inputFieldDescription}
                        placeholder="Descripcion"
                        placeholderTextColor={colors.neutral400}
                        value={targetDescription}
                        onChange={e => {
                          setTargetDescription(e.nativeEvent.text);
                          countDescription(e.nativeEvent.text);
                        }}
                        onFocus={() => setIsFocusDescription(true)}
                        onBlur={() => setIsFocusDescription(false)}
                        multiline
                        maxLength={140}
                      />
                    </Input>
                    <Text style={styles.textCount}>
                      {countLengthDescription}/140
                    </Text>
                  </VStack>
                  <VStack style={styles.fullWidth}>
                    <Text style={styles.titleTextInput}>{STRINGS.address}</Text>
                    <PressableOpacityScaled
                      onPress={() => stateBottomSheet.current?.present()}
                      containerStyle={styles.fullWidth}>
                      <Input
                        style={[
                          styles.input,
                          {
                            borderColor: isUserLocation
                              ? colors.primary
                              : 'transparent',
                          },
                        ]}
                        pointerEvents="none">
                        <InputField
                          style={styles.inputField}
                          placeholder="Selecciona un estado"
                          placeholderTextColor={colors.neutral400}
                          value={selectedState?.label || ''}
                          editable={false}
                        />
                      </Input>
                    </PressableOpacityScaled>
                  </VStack>
                  <Button
                    style={styles.buttonSave}
                    onPress={async () => {
                      await handleUpdateProfile();
                      if (!typeStatusError) {
                        setPopupShow(true);
                        sendToProfile();
                      }
                    }}>
                    <ButtonText bold>
                      {WaitingToSave ? <SpinnerLogin /> : 'Guardar'}
                    </ButtonText>
                  </Button>
                  <Button style={styles.buttonCancel} onPress={sendToProfile}>
                    <ButtonText bold style={styles.titleCancel}>
                      {STRINGS.cancel}
                    </ButtonText>
                  </Button>
                  <Button
                    style={styles.buttonDeactivate}
                    onPress={handleGoToDeactivateAccount}>
                    <ButtonText bold style={styles.deactivateText}>
                      Darme de baja
                    </ButtonText>
                  </Button>
                </View>
              </VStack>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <EditProfilePictureBottomSheet
        ref={bottomSheet}
        onSelectPhoto={handleOnSelectPhoto}
        onPressDelete={handleOnDeletePhoto}
      />
      <StateSelectorBottomSheet
        ref={stateBottomSheet}
        onSelectState={handleSelectState}
        selectedState={selectedState}
      />
    </SafeAreaView>
  );
};

const styleComponents = StyleSheet.create({
  button: {
    width: '97%',
    height: 44,
    borderRadius: 8,
  },
  input: {
    width: '97%',
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
  },
  titleTextInput: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 32.2,
    fontFamily: 'Helvetica',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  containerInputs: {
    alignItems: 'center',
    gap: 8,
    marginTop: -10,
  },
  buttonSave: {
    marginTop: 22,
    gap: 20,
    ...styleComponents.button,
  },
  buttonCancel: {
    ...styleComponents.button,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.neutral300,
  },
  buttonDeactivate: {
    ...styleComponents.button,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: 8,
  },
  titleCancel: {
    color: '#0F172A',
  },
  deactivateText: {
    color: colors.danger,
  },
  input: {
    ...styleComponents.input,
  },
  titleTextInput: {
    ...styleComponents.titleTextInput,
    color: '#0F172A',
  },
  avatarPosition: {
    marginLeft: 15,
    alignSelf: 'flex-start',
  },
  textCount: {
    color: '#94A3B8',
  },
  inputField: {
    backgroundColor: '#F1F5F9',
  },
  changeAvatar: {
    position: 'absolute',
    top: '31%',
    left: 14,
    zIndex: 1,
    height: 25,
    width: 40,
  },
  containerChangeAvatar: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    opacity: 0.9,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 50,
  },
  inputDescription: {
    width: '97%',
    minHeight: 85,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
  },
  inputFieldDescription: {
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: colors.neutral500,
    marginTop: 4,
    fontStyle: 'italic',
  },
  fullWidth: {
    width: '97%',
  },
});

export default EditProfileScreen;
