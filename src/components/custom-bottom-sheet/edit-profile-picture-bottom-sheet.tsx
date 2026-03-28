import {forwardRef} from 'react';
import {BottomSheetModal, BottomSheetView} from '@gorhom/bottom-sheet';
import {StyleSheet, Text} from 'react-native';
import {EditIcon, TrashIcon} from '@gluestack-ui/themed';
import * as ImagePicker from 'expo-image-picker';

import {PressableOpacity} from '../custom-buttons';

import CustomBottomSheet from '.';

import {colors} from '@/config/theme';
import {
  MAX_PROFILE_PICTURE_HEIGHT,
  MAX_PROFILE_PICTURE_WIDTH,
  PROFILE_PICTURE_QUALITY,
  SCREEN_HEIGHT,
} from '@/utils/constants';

// Shim type that matches the shape consumed by callers (assets[0].base64, assets[0].type)
export type ExpoPickerResponse = {
  errorMessage?: string;
  assets?: Array<{
    base64?: string | null;
    type?: string;
    uri?: string;
  }>;
};

interface EditProfilePictureBottomSheetProps {
  onDismiss?: () => void;
  onPressDelete?: () => void;
  onSelectPhoto: (data: ExpoPickerResponse) => void;
}

export const EditProfilePictureBottomSheet = forwardRef<
  BottomSheetModal,
  EditProfilePictureBottomSheetProps
>(({onDismiss, onPressDelete, onSelectPhoto}, ref) => {
  const handleOnPressChangeProfilePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      base64: true,
      quality: PROFILE_PICTURE_QUALITY,
      exif: false,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const response: ExpoPickerResponse = {
      assets: [
        {
          base64: asset.base64,
          // expo-image-picker provides mimeType, fall back to image/jpeg
          type: asset.mimeType ?? 'image/jpeg',
          uri: asset.uri,
        },
      ],
    };

    onSelectPhoto(response);
  };

  return (
    <CustomBottomSheet
      ref={ref}
      title="Cambiar foto de perfil"
      onDismiss={onDismiss}
      snapPoints={[SCREEN_HEIGHT * 0.3]}>
      <BottomSheetView style={styles.container}>
        <PressableOpacity
          onPress={handleOnPressChangeProfilePicture}
          containerStyle={styles.fullWidth}
          style={_ => styles.button}>
          <EditIcon size="lg" />
          <Text style={styles.text}>Cambiar foto de perfil</Text>
        </PressableOpacity>
        <PressableOpacity
          onPress={onPressDelete}
          containerStyle={styles.fullWidth}
          style={_ => styles.button}>
          <TrashIcon size="lg" color={colors.danger} />
          <Text style={[styles.text, styles.danger]}>
            Borrar foto de perfil
          </Text>
        </PressableOpacity>
      </BottomSheetView>
    </CustomBottomSheet>
  );
});

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 5,
    padding: 2,
    width: '100%',
  },
  text: {
    fontSize: 18,
  },
  danger: {
    color: colors.danger,
  },
  container: {
    alignItems: 'flex-start',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 32,
    gap: 18,
  },
});
