/**
 * TimePickerSheet — elegir una hora (en minutos desde medianoche), con la UI
 * de Torna. Mismo patrón que `LevelPickerSheet` (`Modal` transparente + hoja
 * de abajo + swipe-to-dismiss) — ningún picker nativo, mismo motivo: look
 * inconsistente entre plataformas y texto cortado.
 */
import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import { TIME_OPTIONS, minuteToLabel } from '../lib/schedule';

export interface TimePickerSheetProps {
  visible: boolean;
  title: string;
  value: number;
  onSelect: (minute: number) => void;
  onClose: () => void;
}

export function TimePickerSheet({ visible, title, value, onSelect, onClose }: TimePickerSheetProps) {
  const { colors } = useTheme();
  const { translateY, panHandlers } = useSwipeToDismiss(onClose);
  const pick = (m: number) => { onSelect(m); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }} onPress={onClose} testID="time-sheet-backdrop">
        <Animated.View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '70%',
          backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingTop: 14, paddingBottom: 28, transform: [{ translateY }],
        }}>
          <Pressable onPress={() => {}}>
            <View {...panHandlers}>
              <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.3, paddingHorizontal: 20, marginBottom: 12 }}>
                {title}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {TIME_OPTIONS.map((m) => {
                const on = value === m;
                return (
                  <Pressable key={m} onPress={() => pick(m)} testID={`time-option-${m}`}
                    accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 20, paddingVertical: 11,
                      backgroundColor: on ? colors.bg2 : 'transparent',
                    }}>
                    <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text }}>{minuteToLabel(m)}</Text>
                    {on && <Check size={18} color={colors.accentText} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
