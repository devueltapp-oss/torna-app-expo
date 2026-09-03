import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Home, Crosshair, LayoutGrid, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../theme';

export type TabId = 'home' | 'games' | 'courts' | 'chats' | 'profile';
export type Role = 'club' | 'player';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  /** Determines the tab set + order. `home` is always visually centered. */
  role?: Role;
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

export function BottomTabBar({ active, onChange, role = 'club', safeBottom = 18 }: Props) {
  const { colors } = useTheme();
  const tabs = TABS_BY_ROLE[role];
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.line,
      paddingTop: 10, paddingBottom: safeBottom,
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
