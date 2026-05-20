import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button } from '../components/ui';

interface Props {
  /** All KV pairs to render in the summary card (in display order). */
  summary: { label: string; value: string | React.ReactNode }[];
  heroLine?: string;
  /** Default: "¡Reserva confirmada!" */
  title?: string;
  onBackToClub?: () => void;
  onShare?: () => void;
}

/**
 * Success screen for the reservation flow. Big circular check, success copy,
 * KV summary of the reservation, primary CTA back to the club's profile.
 */
export function ReserveSuccessScreen({
  summary, heroLine, title = '¡Reserva confirmada!', onBackToClub, onShare,
}: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingVertical: 32, gap: 20, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 120, height: 120, borderRadius: 36, backgroundColor: colors.okBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={56} color={colors.okFg} strokeWidth={2.4}/>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', fontSize: 24, color: colors.text, letterSpacing: -0.4 }}>{title}</Text>
          {heroLine ? (
            <Text style={{ color: colors.muted2, fontSize: 14, marginTop: 8, lineHeight: 20, textAlign: 'center' }}>{heroLine}</Text>
          ) : null}
        </View>

        <View style={{
          width: '100%', backgroundColor: colors.bg2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, gap: 8,
        }}>
          {summary.map((kv, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.muted2, fontWeight: '700', fontSize: 12, letterSpacing: 0.4 }}>{kv.label}</Text>
              {typeof kv.value === 'string'
                ? <Text style={{ fontWeight: '700', color: colors.text, fontSize: 12 }}>{kv.value}</Text>
                : kv.value}
            </View>
          ))}
        </View>

        <View style={{ width: '100%', gap: 8 }}>
          <Button fullWidth size="lg" onPress={onBackToClub}>Volver al perfil del club</Button>
          {onShare && (
            <Pressable onPress={onShare} style={{ alignItems: 'center', paddingVertical: 4 }}>
              <Text style={{ color: colors.accentText, fontSize: 13, fontWeight: '700' }}>Compartir invitación</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Helper for mono-styled reservation IDs in the KV grid. */
export function MonoValue({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontFamily: fonts.mono, color: colors.text, fontWeight: '700', fontSize: 12 }}>{children}</Text>
  );
}
