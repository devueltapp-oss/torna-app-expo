import React from 'react';
import { View, Image, Pressable, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { Avatar } from './ui';

export interface ProfileHeroAvatarProps {
  name: string;
  imageUri?: string;
  /** true → aro verde alrededor del avatar (el perfil está EN VIVO). */
  live?: boolean;
  size?: number;
  /**
   * Tap rápido (uno o dos toques): si el perfil está en vivo, abre la
   * transmisión vinculada. Si no está en vivo, el tap no hace nada.
   */
  onPressLive?: () => void;
}

/**
 * Avatar del hero de un perfil público, con dos gestos sobre la foto:
 *
 *  - **Tap**: si el perfil está EN VIVO, abre la transmisión a la que está
 *    vinculado (la partida en curso). Antes la foto no era tocable y el único
 *    acceso al vivo era el badge "EN VIVO".
 *  - **Mantener presionado**: muestra la foto de perfil a pantalla completa;
 *    al soltar, se cierra sola. Sin foto (avatar de iniciales) el hold no hace
 *    nada.
 *
 * El aro verde alrededor del avatar significa "en vivo" — antes marcaba
 * "club", que ahora se identifica con el check junto al nombre.
 */
export function ProfileHeroAvatar({
  name, imageUri, live = false, size = 72, onPressLive,
}: ProfileHeroAvatarProps) {
  const { colors } = useTheme();
  const [holding, setHolding] = React.useState(false);
  const canPreview = !!imageUri;

  return (
    <>
      <Pressable
        onPress={() => { if (live) onPressLive?.(); }}
        onLongPress={() => { if (canPreview) setHolding(true); }}
        onPressOut={() => setHolding(false)}
        delayLongPress={200}
        accessibilityRole="imagebutton"
        accessibilityLabel={live ? 'Ver la transmisión en vivo' : 'Foto de perfil'}
      >
        <View
          style={live
            ? { borderRadius: size / 2 + 6, borderWidth: 3, borderColor: colors.live, padding: 2 }
            : { borderRadius: size / 2, overflow: 'hidden' }}
        >
          {/* El aro interno usa el color de FONDO del hero, no blanco fijo: es lo
              que crea el "hueco" entre la foto y el aro verde de "en vivo" —
              tiene que fundirse con la superficie de atrás, sea cual sea el
              tema, o sea el color que se le puso al hero (ver 2026-09-09:
              unificación con `colors.bg`). Blanco fijo se volvía invisible
              apenas el hero dejó de ser azul en modo claro. */}
          <Avatar name={name} size={size} imageUri={imageUri} ringColor={colors.bg} />
        </View>
      </Pressable>

      {/* Preview a pantalla completa mientras se mantiene presionado. Se cierra
          en `onPressOut` (soltar), o con el back de Android vía onRequestClose.
          El Modal no intercepta el gesto en curso, así que el `onPressOut` del
          Pressable de arriba sigue llegando al soltar. */}
      <Modal
        visible={holding && canPreview}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setHolding(false)}
      >
        <View style={[StyleSheet.absoluteFill, styles.previewBackdrop]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
});
