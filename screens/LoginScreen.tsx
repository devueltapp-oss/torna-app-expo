import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';

const tornaLogo = require('../assets/torna-icon.png');

export function LoginScreen({ onLogin, onRegister, onForgot }: {
  onLogin?: () => void; onRegister?: () => void; onForgot?: () => void;
}) {
  const { colors } = useTheme();
  const [email, setEmail] = React.useState('');
  const [pass,  setPass]  = React.useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 40, gap: 14 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 20, backgroundColor: '#FFFFFF',
            borderWidth: 1, borderColor: colors.line,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Image source={tornaLogo} style={{ width: 48, height: 48 }} />
          </View>
        </View>

        <Input label="Email" placeholder="club@padelclub.com" icon={<Mail size={18} color={colors.muted2}/>}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Contraseña" placeholder="••••••••" icon={<Lock size={18} color={colors.muted2}/>}
          value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" />

        <Text onPress={onForgot} style={{ alignSelf: 'flex-end', fontSize: 12, fontWeight: '700', color: colors.text }}>
          Olvidé mi contraseña
        </Text>

        <Button fullWidth size="lg" onPress={onLogin} style={{ marginTop: 6 }}>Ingresar</Button>
        <Button fullWidth size="lg" variant="ghost" onPress={onRegister}>Registrar un nuevo club</Button>

        <View style={{ flex: 1 }} />
        <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11, paddingTop: 20 }}>
          Versión 1.0.0 · <Text style={{ fontWeight: '700', color: colors.text2 }}>torna</Text>.io
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
