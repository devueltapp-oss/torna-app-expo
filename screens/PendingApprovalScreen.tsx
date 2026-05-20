import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button } from '../components/ui';

export function PendingApprovalScreen({ onHome, email = 'contacto@padelbsas.com' }: { onHome?: () => void; email?: string }) {
  const { colors } = useTheme();
  const steps = [
    { label: 'Recibimos tu solicitud', state: 'done' },
    { label: 'Revisión por admin',     state: 'active' },
    { label: 'Acceso al panel del club', state: 'pending' },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 28, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 18 }}>
        <View style={{
          width: 120, height: 120, borderRadius: 36, backgroundColor: colors.okBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={56} strokeWidth={2.4} color={colors.success} />
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontWeight: '800', fontSize: 24, color: colors.text, letterSpacing: -0.5 }}>Registro recibido</Text>
          <Text style={{ color: colors.muted2, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>
            Estamos revisando tu club. Te enviaremos un email a <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text> en menos de 24 horas.
          </Text>
        </View>
        <View style={{ width: '100%', backgroundColor: colors.bg2, borderRadius: 14, padding: 16, gap: 10 }}>
          {steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: s.state === 'done' ? colors.success : s.state === 'active' ? colors.warnBg : colors.bg3,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {s.state === 'done'
                  ? <Check size={14} color="#FFFFFF" />
                  : <Text style={{ color: s.state === 'active' ? colors.warnFg : colors.muted, fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>}
              </View>
              <Text style={{ color: s.state === 'pending' ? colors.muted2 : colors.text, fontSize: 13, fontWeight: '600' }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Button fullWidth variant="ghost" onPress={onHome}>Volver al inicio</Button>
      </View>
    </SafeAreaView>
  );
}
