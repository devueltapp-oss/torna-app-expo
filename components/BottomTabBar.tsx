import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
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
  return (
    <View testID="bottom-tab-bar" style={{
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.line,
      paddingTop: 10, paddingBottom: bottomPadding,
    }}>
      {tabs.map(({ id, label, Icon }) => {
        const on = active === id;
        return (
          <Pressable key={id} onPress={() => onChange(id)}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 6 }}>
            {on && (
              <View style={{
                position: 'absolute', top: -10, width: 26, height: 3,
                // La barrita es un BLOQUE de color, no texto: el lima sólido se
                // ve bien en los dos temas y es la señal de marca.
                backgroundColor: colors.accent, borderRadius: 2,
              }} />
            )}
            {/*
              ⚠️ `accentStrong`, NO `primary`.
              `primary` es el lima `#D6FF7E`, que sobre la superficie clara del
              navbar da **1.14:1** de contraste — o sea, el ítem activo no se
              distinguía del inactivo en modo claro. `accentStrong` es verde
              oscuro en claro (5.08:1) y vuelve a ser lima en oscuro (7.69:1).
            */}
            <Icon size={22} strokeWidth={on ? 2.2 : 2} color={on ? colors.accentStrong : colors.muted} />
            <Text style={{ fontSize: 10, fontWeight: on ? '800' : '600', color: on ? colors.accentStrong : colors.muted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
