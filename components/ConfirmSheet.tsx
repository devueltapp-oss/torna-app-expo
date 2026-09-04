/**
 * ConfirmSheet — confirmación con el lenguaje visual de Torna.
 *
 * Reemplaza a `Alert.alert` para las decisiones del producto. El Alert nativo se ve
 * distinto en cada OS, no respeta el tema claro/oscuro, no usa la tipografía de la
 * marca y en Android pinta los botones en azul de sistema: justo lo contrario de lo
 * que queremos en una acción destructiva, donde el botón peligroso tiene que
 * *verse* peligroso.
 *
 * Mismo patrón que `FollowListSheet`/`ApplyMatchSheet`: `Modal` transparente,
 * velo azul de marca, hoja de abajo con esquinas redondeadas y drag handle. Tocar
 * fuera o el botón de cancelar cierra.
 *
 * `destructive` pinta el botón de confirmar en `colors.destructive` (ver la nota
 * del token en `theme/tokens.ts`: es la única excepción al manual de 3 colores).
 *
 * ⚠️ La barrita de arriba (drag handle) ahora SÍ cierra deslizándola hacia
 * abajo (`useSwipeToDismiss`) — antes era decorativa en los dos sistemas, no
 * "algo que andaba en iOS y no en Android": nunca tuvo un gesto real en
 * ninguno de los dos.
 */
import React from 'react';
import { Modal, View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

export interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  /** Cuerpo opcional. Si la pregunta se explica sola, no hace falta. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Mientras corre, el botón muestra spinner y no se puede tocar de nuevo. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { colors, radii } = useTheme();
  const confirmBg = destructive ? colors.destructive : colors.accent;
  const confirmFg = destructive ? colors.destructiveFg : colors.primaryFg;
  const { translateY, panHandlers } = useSwipeToDismiss(loading ? () => {} : onCancel);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }}
        onPress={loading ? undefined : onCancel}
        testID="confirm-sheet-backdrop"
      >
        <Animated.View
          {...panHandlers}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34,
            transform: [{ translateY }],
          }}
        >
          <Pressable onPress={() => {}}>
          {/* Drag handle: el `PanResponder` está en el contenedor de arriba
              (`Animated.View`), así que arrastrar desde cualquier parte de la
              hoja también cierra — no hace falta acotarlo a esta barrita. Se
              activa solo con arrastre vertical claro (`dy > 4`), así que no
              compite con los toques normales de los botones de abajo. */}
          <View style={{
            alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
            backgroundColor: colors.line, marginBottom: 18,
          }} />

          <Text
            testID="confirm-sheet-title"
            style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.3 }}
          >
            {title}
          </Text>

          {message ? (
            <Text style={{ fontSize: 14, color: colors.muted2, lineHeight: 20, marginTop: 8 }}>
              {message}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            <Pressable
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
              testID="confirm-sheet-cancel"
              style={({ pressed }) => ({
                flex: 1, height: 48, borderRadius: radii.xl,
                borderWidth: 1, borderColor: colors.line,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.text }}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              testID="confirm-sheet-confirm"
              style={({ pressed }) => ({
                flex: 1, height: 48, borderRadius: radii.xl,
                backgroundColor: confirmBg,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed || loading ? 0.85 : 1,
              })}
            >
              {loading ? (
                <ActivityIndicator color={confirmFg} />
              ) : (
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: confirmFg }}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
