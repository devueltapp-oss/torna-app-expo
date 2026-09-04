/**
 * ImageViewerModal — visor full-screen para ampliar una foto (p. ej. la de perfil).
 *
 * Modal sobre fondo oscuro con pinch-to-zoom. Usa react-native-gesture-handler v2
 * (`GestureDetector` + `Gesture.Pinch`) actualizando un `Animated.Value` de RN
 * (reanimated NO está instalado en el proyecto). Los gestos dentro de un `Modal`
 * sólo funcionan si el contenido se envuelve en `<GestureHandlerRootView>`.
 *
 * Presentacional: todo el estado de visibilidad lo maneja el padre.
 */
import React from 'react';
import { Modal, View, Pressable, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';

export interface ImageViewerModalProps {
  visible: boolean;
  uri?: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ImageViewerModal({ visible, uri, onClose }: ImageViewerModalProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const baseScale = React.useRef(1);

  // Reinicia el zoom cada vez que se abre.
  React.useEffect(() => {
    if (visible) {
      baseScale.current = 1;
      scale.setValue(1);
    }
  }, [visible, scale]);

  const pinch = React.useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onUpdate((e) => {
          scale.setValue(clamp(baseScale.current * e.scale, MIN_SCALE, MAX_SCALE));
        })
        .onEnd((e) => {
          const next = clamp(baseScale.current * e.scale, MIN_SCALE, MAX_SCALE);
          baseScale.current = next;
          if (next <= MIN_SCALE) {
            baseScale.current = 1;
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
          }
        }),
    [scale],
  );

  /**
   * Tocar la imagen (o el negro alrededor, que es el mismo contenedor) cierra
   * el visor. Antes esto vivía en un `Pressable` de fondo aparte, pero ese
   * `Pressable` quedaba TAPADO por este mismo contenedor (que es `flex:1`, o
   * sea pantalla completa) apenas había `uri` — que es casi siempre: el toque
   * nunca lo alcanzaba. En iPhone la única salida que quedaba era la X de la
   * esquina (40px); sin un botón de sistema de por medio como en Android, un
   * toque que erraba por poco se sentía como "no hay forma de volver".
   * `Gesture.Race` con el pinch: dos dedos zoomean, un dedo cierra — nunca
   * compiten por el mismo toque.
   */
  const tapToClose = React.useMemo(
    () => Gesture.Tap().onEnd(() => onClose()),
    [onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
          {uri ? (
            <GestureDetector gesture={Gesture.Race(pinch, tapToClose)}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.Image
                  source={{ uri }}
                  resizeMode="contain"
                  style={{ width: SCREEN_W, height: SCREEN_H * 0.8, transform: [{ scale }] }}
                />
              </View>
            </GestureDetector>
          ) : (
            // Sin imagen: el fondo entero sigue siendo el cierre.
            <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
          )}

          {/* Botón cerrar */}
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, right: 0 }}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 40, height: 40, margin: 12, borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={22} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
