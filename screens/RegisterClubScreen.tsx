import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Mail, MapPin, Lock, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';

export interface ClubRegistrationForm {
  name: string;
  username: string;
  email: string;
  region: string;
  password: string;
}

export function RegisterClubScreen({
  onBack,
  onSubmit,
}: {
  onBack?: () => void;
  onSubmit?: (form: ClubRegistrationForm) => Promise<void> | void;
}) {
  const { colors } = useTheme();
  const [form, setForm] = React.useState<ClubRegistrationForm>({
    name: '', username: '', email: '', region: '', password: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof ClubRegistrationForm) => (v: string) => setForm(s => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (submitting) return;
    const name = form.name.trim();
    const username = form.username.trim().replace(/^@/, '');
    const email = form.email.trim();
    if (!name || !username || !email || !form.password) {
      setError('Completá nombre, username, email y contraseña.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit?.({ ...form, name, username, email });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el club. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

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
        {error && (
          <Text style={{ color: colors.warnFg, fontSize: 12, lineHeight: 17 }}>{error}</Text>
        )}
        <Button fullWidth size="lg" onPress={handleSubmit} style={{ marginTop: 8 }}>
          {submitting ? 'Creando…' : 'Crear club'}
        </Button>
        <Text style={{ textAlign: 'center', color: colors.muted2, fontSize: 12, paddingVertical: 8 }}>
          ¿Ya tienes una cuenta? <Text onPress={onBack} style={{ color: colors.accentText, fontWeight: '700' }}>Ingresa</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
