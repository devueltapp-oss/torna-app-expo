import React from 'react';
import { View, Pressable, Platform, Animated, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Crosshair, LayoutGrid, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../theme';

export type TabId = 'home' | 'games' | 'courts' | 'chats' | 'profile';
export type Role = 'club' | 'player';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  /** Determines the tab set + order. `home` is always visually centered. */
  role?: Role;
  /**
   * Override del padding inferior. Si no se pasa, se calcula del inset real
   * del dispositivo (`useSafeAreaInsets().bottom`) — ver el comentario del
   * componente sobre por qué NO puede ser un número fijo.
   */
  safeBottom?: number;
}

interface TabDef { id: TabId; label: string; Icon: any }

/** Order is intentional:
 *  - club  (5 tabs): Canchas · Juegos · Inicio · Chats · Perfil ('home' centered)
 *  - player(4 tabs): Inicio · Juegos · Chats · Perfil
 *  'Juegos' (player) es el hub de partidos. 'Chats' es el inbox (DMs 1-a-1 + grupos
 *  de partidas). La búsqueda de gente/clubs vive en el header de Inicio (GlobalSearch). */
const TABS_BY_ROLE: Record<Role, TabDef[]> = {
  club: [
    { id: 'courts',  label: 'Canchas',   Icon: LayoutGrid },
    { id: 'games',   label: 'Juegos',    Icon: Crosshair },
    { id: 'home',    label: 'Inicio',    Icon: Home },
    { id: 'chats',   label: 'Chats',     Icon: MessageCircle },
    { id: 'profile', label: 'Perfil',    Icon: User },
  ],
  player: [
    { id: 'home',    label: 'Inicio',    Icon: Home },
    { id: 'games',   label: 'Juegos',    Icon: Crosshair },
    { id: 'chats',   label: 'Chats',     Icon: MessageCircle },
    { id: 'profile', label: 'Perfil',    Icon: User },
  ],
};

const INDICATOR_WIDTH = 26;
// Pedido 2026-09-12: nada de rebotes/overshoot. Color+texto en 120-160ms,
// el indicador un poco más lento (desplazarse se nota menos que un fundido
// brusco), y el ícono activo con una microanimación de escala 0.96→1.
const COLOR_DURATION = 140;
const INDICATOR_DURATION = 180;
const SCALE_DURATION = 130;

/**
 * ⚠️ **El padding inferior NO puede ser un número fijo.** Era `safeBottom = 18`
 * a secas, y con Android edge-to-edge (obligatorio desde API 35 / Android 15,
 * que esta app ya targetea con Expo SDK 55) el contenido dibuja POR DEBAJO de
 * la barra de navegación del sistema — gestos o los 3 botones — en vez de que
 * el OS le reserve el espacio como antes. Con 18px fijos, la fila de tabs
 * quedaba parcial o totalmente tapada por esa barra: "Perfil" (el último tab)
 * era el más tapado, y no había forma de tocarlo. El bug no se veía hasta el
 * primer build nativo real después de la migración a SDK 55 — con el bundle JS
 * viejo, la app corría sobre una config de Android anterior a edge-to-edge.
 *
 * El fix es leer el inset real del dispositivo (`useSafeAreaInsets().bottom`):
 * en gestos es unos 24-48dp, en 3 botones puede ser 0 (la barra ya no se
 * superpone) — cualquier número fijo va a estar mal en alguno de los dos.
 *
 * En Android el padding es EXACTO al inset (piso de 8 solo si el inset es 0,
 * p. ej. navegación por 3 botones): tiene que quedar SIEMPRE arriba de la
 * barra/gestos del sistema, ni un pixel de más que la tape a ella. En iOS el
 * requisito es distinto — no hay riesgo de que un botón nativo tape la tab
 * bar, así que se le suma un poco de aire (`+8`) para que quede visualmente
 * elevada sobre el home indicator en vez de pegada justo al borde.
 */
export function BottomTabBar({ active, onChange, role = 'club', safeBottom }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = safeBottom ?? (
    Platform.OS === 'ios' ? insets.bottom + 8 : Math.max(insets.bottom, 8)
  );
  const tabs = TABS_BY_ROLE[role];
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === active));

  // La barrita indicadora es UNA sola que se desliza al tab activo (en vez de
  // aparecer/desaparecer de golpe en cada uno) — necesita el ancho real de la
  // fila para calcular a qué X moverse.
  const [rowWidth, setRowWidth] = React.useState(0);
  const tabWidth = tabs.length ? rowWidth / tabs.length : 0;
  const indicatorX = React.useRef(new Animated.Value(0)).current;
  const indicatorPlaced = React.useRef(false);

  React.useEffect(() => {
    if (!tabWidth) return;
    const target = tabWidth * activeIndex + (tabWidth - INDICATOR_WIDTH) / 2;
    if (!indicatorPlaced.current) {
      // Primer layout conocido: ubicarla sin animar (si no, entraría
      // deslizando desde el borde izquierdo apenas se mide la fila).
      indicatorX.setValue(target);
      indicatorPlaced.current = true;
      return;
    }
    Animated.timing(indicatorX, {
      toValue: target, duration: INDICATOR_DURATION, useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, tabWidth]);

  const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  return (
    <View
      testID="bottom-tab-bar"
      onLayout={onRowLayout}
      style={{
        flexDirection: 'row', backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.line,
        paddingTop: 10, paddingBottom: bottomPadding,
      }}
    >
      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 0, width: INDICATOR_WIDTH, height: 3, borderRadius: 2,
            // La barrita es un BLOQUE de color, no texto: el lima sólido se
            // ve bien en los dos temas y es la señal de marca.
            backgroundColor: colors.accent,
            transform: [{ translateX: indicatorX }],
          }}
        />
      )}
      {tabs.map(({ id, label, Icon }) => (
        <TabButton
          key={id}
          label={label}
          Icon={Icon}
          active={active === id}
          mutedColor={colors.muted}
          // ⚠️ `accentStrong`, NO `primary`.
          // `primary` es el lima `#BFFE3D`, que sobre la superficie clara del
          // navbar da **1.20:1** de contraste — o sea, el ítem activo no se
          // distinguía del inactivo en modo claro. `accentStrong` es verde
          // oscuro en claro (5.08:1) y vuelve a ser lima en oscuro (12.61:1
          // sobre la superficie navy `#0E2646`).
          activeColor={colors.accentStrong}
          onPress={() => onChange(id)}
        />
      ))}
    </View>
  );
}

function TabButton({ label, Icon, active, mutedColor, activeColor, onPress }: {
  label: string;
  Icon: any;
  active: boolean;
  mutedColor: string;
  activeColor: string;
  onPress: () => void;
}) {
  // `progress` maneja el fundido cruzado ícono muted↔accent y el color/peso
  // del label — todo junto porque ninguno de los dos admite native driver
  // (interpolación de color). `scale` es aparte y SÍ va por native driver:
  // es la única microanimación de transform (0.96 → 1 al activarse).
  const progress = React.useRef(new Animated.Value(active ? 1 : 0)).current;
  const scale = React.useRef(new Animated.Value(1)).current;
  const wasActive = React.useRef(active);

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0, duration: COLOR_DURATION, useNativeDriver: false,
    }).start();

    // La microanimación de escala es SOLO al entrar al tab (no al salir, y no
    // en el render inicial si ya nace activo — si no, Inicio "rebotaría" cada
    // vez que se abre la app). Sin overshoot: 0.96 → 1, sin resorte.
    if (active && !wasActive.current) {
      scale.setValue(0.96);
      Animated.timing(scale, { toValue: 1, duration: SCALE_DURATION, useNativeDriver: true }).start();
    }
    wasActive.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const textColor = progress.interpolate({ inputRange: [0, 1], outputRange: [mutedColor, activeColor] });

  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 6 }}>
      <Animated.View style={{ width: 22, height: 22, transform: [{ scale }] }}>
        <Animated.View style={{ position: 'absolute', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Icon size={22} strokeWidth={2} color={mutedColor} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', opacity: progress }}>
          <Icon size={22} strokeWidth={2.2} color={activeColor} />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={{ fontSize: 10, fontWeight: active ? '800' : '600', color: textColor }}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}
