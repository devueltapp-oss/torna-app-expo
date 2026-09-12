/**
 * FollowListScreen — lista de seguidores/seguidos, a pantalla completa.
 *
 * Un solo componente, reusado tal cual para "mis" seguidores/seguidos (perfil
 * propio) y para los de CUALQUIER otro usuario (perfil ajeno) — ver
 * `PlayerProfileScreen`/`ClubProfileScreen`/`MainPlayer` en App.tsx, que la
 * empujan a la pila con `users` distintos.
 *
 * ⚠️ Antes era un `<Modal presentationStyle="fullScreen">` (`components/
 * FollowListSheet.tsx`, eliminado 2026-09-11): al ser un Modal de RN y no una
 * ruta del `native-stack`, no tenía el gesto nativo de "volver" (swipe desde
 * el borde izquierdo en iOS) — solo se podía cerrar tocando la flecha. Ahora
 * es una `AppStack.Screen` real, así que hereda el mismo swipe-back nativo
 * que ya tienen `PlayerProfile`/`ClubProfile`/etc. (nadie en el navigator
 * pone `gestureEnabled: false`, así que viene activado por default).
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader, Avatar } from '../components/ui';
import type { FollowItem } from '../data/types';

export interface FollowListScreenProps {
  title: string;
  users: FollowItem[];
  onBack: () => void;
  onOpenProfile: (playerId: string) => void;
}

export function FollowListScreen({ title, users, onBack, onOpenProfile }: FollowListScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title={title}
        left={
          <Pressable onPress={onBack} hitSlop={10} testID="follow-list-back">
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
        }
      />

      {users.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.muted2, fontSize: 14 }}>Nadie todavía</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
        >
          {users.map((u, i) => (
            <React.Fragment key={u.id}>
              <Pressable
                onPress={() => onOpenProfile(u.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}
              >
                <Avatar name={u.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.text }}>{u.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted2 }}>{u.username}</Text>
                </View>
                <ChevronRight size={16} color={colors.muted2} />
              </Pressable>
              {i < users.length - 1 && (
                <View style={{ height: 1, backgroundColor: colors.line }} />
              )}
            </React.Fragment>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
