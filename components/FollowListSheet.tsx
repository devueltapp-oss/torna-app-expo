/**
 * FollowListSheet — lista de seguidores/seguidos, a pantalla completa.
 *
 * Un solo componente, reusado tal cual para "mis" seguidores/seguidos (perfil
 * propio) y para los de CUALQUIER otro usuario (perfil ajeno) — ver
 * `PlayerProfileScreen`/`ClubProfileScreen` en App.tsx, que renderizan el mismo
 * `<FollowListSheet>` con `users` distintos.
 *
 * ⚠️ Antes era un `Modal` transparente con hoja de abajo (`maxHeight: '70%'`):
 * con una lista larga de seguidores, quedarse a mitad de pantalla se sentía
 * cortado — la mitad de arriba en blanco, sin nada que la use, y había que
 * scrollear dentro de una caja chica en vez de la pantalla entera. Ahora es
 * pantalla completa, mismo patrón que `PlayerSearchOverlay`/`AppHeader`.
 */
import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader, Avatar } from './ui';
import type { FollowItem } from '../data/types';

export interface FollowListSheetProps {
  visible: boolean;
  title: string;
  users: FollowItem[];
  onClose: () => void;
  onOpenProfile?: (playerId: string) => void;
}

export function FollowListSheet({ visible, title, users, onClose, onOpenProfile }: FollowListSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <AppHeader
          title={title}
          left={
            <Pressable onPress={onClose} hitSlop={10} testID="follow-list-close">
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
                  onPress={() => { onClose(); onOpenProfile?.(u.id); }}
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
    </Modal>
  );
}
