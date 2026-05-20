import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Mail, MapPin, Lock, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';

export function RegisterClubScreen({ onBack, onSubmit }: { onBack?: () => void; onSubmit?: () => void }) {
  const { colors } = useTheme();
  const [form, setForm] = React.useState({
    name: '', username: '', email: '', region: '', password: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(s => ({ ...s, [k]: v }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line,
      }}>
        <ChevronLeft size={22} color={colors.text} onPress={onBack} />
        <Text style={{ fontWeight: '800', fontSize: 17, color: colors.text }}>Registrar club</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <View style={{
          flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          backgroundColor: colors.warnBg, padding: 12, borderRadius: 12,
        }}>
          <AlertTriangle size={18} color={colors.warnFg} />
          <Text style={{ flex: 1, color: colors.warnFg, fontSize: 12, lineHeight: 17 }}>
            <Text style={{ fontWeight: '800' }}>Aprobación manual.</Text> Tu registro se revisa por un administrador en menos de 24 h.
          </Text>
        </View>
        <Input label="Nombre del club" placeholder="Ej. Club Pádel Buenos Aires" value={form.name} onChangeText={set('name')} />
        <Input label="Username" placeholder="@padelbsas" value={form.username} onChangeText={set('username')} autoCapitalize="none" hint="Solo letras, números y guiones bajos." />
        <Input label="Email" icon={<Mail size={18} color={colors.muted2}/>} placeholder="contacto@padelbsas.com" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Región" icon={<MapPin size={18} color={colors.muted2}/>} placeholder="Buenos Aires, AR" value={form.region} onChangeText={set('region')} />
        <Input label="Contraseña" icon={<Lock size={18} color={colors.muted2}/>} placeholder="Mínimo 8 caracteres" value={form.password} onChangeText={set('password')} secureTextEntry hint="8+ caracteres con mayúscula, número y carácter especial." />
        <Button fullWidth size="lg" onPress={onSubmit} style={{ marginTop: 8 }}>Crear club</Button>
        <Text style={{ textAlign: 'center', color: colors.muted2, fontSize: 12, paddingVertical: 8 }}>
          ¿Ya tienes una cuenta? <Text onPress={onBack} style={{ color: colors.accentText, fontWeight: '700' }}>Ingresa</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
