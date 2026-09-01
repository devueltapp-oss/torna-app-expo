/**
 * InAppNotificationHost — mini notificación dentro de la app.
 *
 * Con la app abierta, OneSignal ya no muestra el banner del sistema (lo suprime
 * `foregroundWillDisplay` en `services/notifications.ts`): lo reemplaza esta
 * tarjeta, que sigue el tema de Torna, es tocable y navega con la MISMA tabla de
 * ruteo que el push y la campanita (`resolvePushTarget`).
 *
 * El caso que la motivó es el chat: si te llega un mensaje mientras estás en otra
 * pantalla, no había ninguna señal in-app (solo el push del OS, que en primer
 * plano muchas veces ni aparece).
 *
 * Reglas:
 *  - Solo se muestra si el push llegó con la app en primer plano y el usuario NO
 *    está parado en la pantalla de destino (eso ya lo filtra el servicio).
 *  - Uno por vez: si llega otro antes de que se vaya, lo reemplaza (y reinicia el
 *    temporizador). No hay cola — el destino final es la campanita/el inbox.
 *  - Se va sola a los 4.5 s, con la X, al tocarla (navega) o al deslizarla hacia
 *    arriba.
 */
import React from 'react';
import { Animated, Easing, PanResponder, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, MessageCircle, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { addForegroundPushListener, type ForegroundPush } from '../services/notifications';

/** Cuánto queda en pantalla antes de irse sola. */
const VISIBLE_MS = 4500;

const CHAT_TYPES = ['NEW_CHAT_MESSAGE', 'NEW_DM_MESSAGE'];

function isChat(push: ForegroundPush): boolean {
  return CHAT_TYPES.includes((push.data.type ?? '').toUpperCase());
}

export interface InAppNotificationHostProps {
  /** Ref del NavigationContainer: el host vive FUERA de los navigators, así que
   *  no puede usar `useNavigation()`. */
  navigationRef: React.RefObject<any>;
  /** Las cuentas de club no tienen `MainPlayer` en su stack. */
  isClub?: boolean;
}

export function InAppNotificationHost({ navigationRef, isClub = false }: InAppNotificationHostProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [push, setPush] = React.useState<ForegroundPush | null>(null);

  const anim = React.useRef(new Animated.Value(0)).current; // 0 = oculta, 1 = visible
  const drag = React.useRef(new Animated.Value(0)).current; // desplazamiento del gesto
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = React.useCallback(() => {
    clearTimer();
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPush(null);
        drag.setValue(0);
      }
    });
  }, [anim, drag, clearTimer]);

  // Suscripción al push de primer plano. El servicio ya descartó los que el
  // usuario está viendo, así que acá todo lo que llega se muestra.
  React.useEffect(() => {
    const off = addForegroundPushListener((incoming) => {
      setPush(incoming);
      drag.setValue(0);
      clearTimer();
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(() => hide(), VISIBLE_MS);
    });
    return () => {
      off();
      clearTimer();
    };
  }, [anim, drag, hide, clearTimer]);

  const open = React.useCallback(() => {
    const target = push?.target;
    hide();
    if (!target || !navigationRef.current) return;
    // `resolvePushTarget` habla en términos del stack del player; una cuenta de
    // club no tiene `MainPlayer` como hogar (mismo ajuste que la campanita).
    const name = target.name === 'MainPlayer' && isClub ? 'MainClub' : target.name;
    navigationRef.current.navigate(name, target.params);
  }, [push, hide, navigationRef, isClub]);

  // Deslizar hacia arriba la descarta. Solo se captura el gesto vertical hacia
  // arriba: así el tap sigue llegando al Pressable.
  const pan = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy < -4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: clearTimer,
        onPanResponderMove: (_e, g) => drag.setValue(Math.min(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -28) {
            hide();
            return;
          }
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
          timerRef.current = setTimeout(() => hide(), VISIBLE_MS);
        },
      }),
    [drag, hide, clearTimer],
  );

  if (!push) return null;

  const Icon = isChat(push) ? MessageCircle : Bell;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 6,
        left: 12,
        right: 12,
        opacity: anim,
        transform: [
          { translateY: Animated.add(anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }), drag) },
        ],
      }}
    >
      {/* Los panHandlers van acá y no en el Animated.View: ese es `box-none`
          (no puede ser responder de un toque) y el gesto nunca le llegaría. */}
      <View {...pan.panHandlers}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${push.title}. ${push.body}`}
          testID="in-app-notification"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            opacity: pressed ? 0.9 : 1,
            // Sombra: la tarjeta flota sobre la pantalla, y en claro comparte el
            // blanco con el fondo — sin esto no se despega.
            shadowColor: '#2d4c75',
            shadowOpacity: 0.22,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          })}
        >
          <View style={{
            width: 34, height: 34, borderRadius: 17,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.accent,
          }}>
            <Icon size={18} color={colors.ink} strokeWidth={2.2} />
          </View>

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.text }}>
              {push.title}
            </Text>
            {!!push.body && (
              <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 16, color: colors.muted2, marginTop: 1 }}>
                {push.body}
              </Text>
            )}
          </View>

          <Pressable
            onPress={hide}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Descartar"
            testID="in-app-notification-dismiss"
          >
            <X size={16} color={colors.muted} />
          </Pressable>
        </Pressable>
      </View>
    </Animated.View>
  );
}
