import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Home, Crosshair, LayoutGrid, Users, User } from 'lucide-react-native';
import Svg, { G, Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../theme';

function PadelRacketsIcon({ size = 22, strokeWidth = 2, color = 'black' }: { size?: number; strokeWidth?: number; color?: string }) {
  const sw = strokeWidth;
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      {/* Racket izquierda: cabeza arriba-izquierda, mango abajo-derecha */}
      <G transform="rotate(-42, 11, 11)">
        <Ellipse cx="11" cy="6" rx="4" ry="4.5" stroke={color} strokeWidth={sw} fill="none" />
        <Path
          d="M10 10.5 L10 18 Q11 20 12 18 L12 10.5"
          stroke={color} strokeWidth={sw} fill="none"
          strokeLinejoin="round" strokeLinecap="round"
        />
      </G>
      {/* Racket derecha: cabeza arriba-derecha, mango abajo-izquierda */}
      <G transform="rotate(42, 11, 11)">
        <Ellipse cx="11" cy="6" rx="4" ry="4.5" stroke={color} strokeWidth={sw} fill="none" />
        <Path
          d="M10 10.5 L10 18 Q11 20 12 18 L12 10.5"
          stroke={color} strokeWidth={sw} fill="none"
          strokeLinejoin="round" strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

export type TabId = 'home' | 'games' | 'courts' | 'players' | 'profile' | 'search';
export type Role = 'club' | 'player';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  /** Determines the tab set + order. `home` is always visually centered. */
  role?: Role;
  safeBottom?: number;
}

interface TabDef { id: TabId; label: string; Icon: any }

/** Order is intentional: 'home' sits at the visual center for both roles.
 *  - club  (5 tabs): Canchas · Juegos · Inicio · Jugadores · Perfil
 *  - player(5 tabs): Juegos · Buscar · Inicio · Jugadores · Perfil
 *  The 'search' tab is player-only — opens SearchPlay (GPS discovery). */
const TABS_BY_ROLE: Record<Role, TabDef[]> = {
  club: [
    { id: 'courts',  label: 'Canchas',   Icon: LayoutGrid },
    { id: 'games',   label: 'Juegos',    Icon: Crosshair },
    { id: 'home',    label: 'Inicio',    Icon: Home },
    { id: 'players', label: 'Jugadores', Icon: Users },
    { id: 'profile', label: 'Perfil',    Icon: User },
  ],
  player: [
    { id: 'games',   label: 'Juegos',    Icon: Crosshair },
    { id: 'search',  label: 'Buscar',    Icon: PadelRacketsIcon },
    { id: 'home',    label: 'Inicio',    Icon: Home },
    { id: 'players', label: 'Jugadores', Icon: Users },
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
                backgroundColor: colors.accent, borderRadius: 2,
              }} />
            )}
            <Icon size={22} strokeWidth={on ? 2.2 : 2} color={on ? colors.primary : colors.muted} />
            <Text style={{ fontSize: 10, fontWeight: on ? '800' : '600', color: on ? colors.primary : colors.muted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
