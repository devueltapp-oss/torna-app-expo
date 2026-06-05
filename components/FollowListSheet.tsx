import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar } from './ui';
import type { FollowItem } from '../data/mocks';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }} onPress={onClose}>
        <Pressable
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34,
            maxHeight: '70%',
          }}
          onPress={() => {}}
        >
          {/* drag handle */}
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />

          {/* título */}
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginBottom: 14 }}>
            {title}
          </Text>

          {users.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 14, textAlign: 'center', paddingVertical: 24 }}>
              Nadie todavía
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {users.map((u, i) => (
                <React.Fragment key={u.id}>
                  <Pressable
                    onPress={() => { onClose(); onOpenProfile?.(u.id); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
