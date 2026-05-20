import React from 'react';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User as UserIcon, Home, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';

const tornaLogo = require('../assets/torna-icon.png');

export type LoginRole = 'player' | 'club';

interface Props {
  onLogin?: (role: LoginRole) => void;
  onRegister?: (role: LoginRole) => void;
  onForgot?: () => void;
}

/**
 * Login with role-picker. Segmented control toggles between Player and Club
 * mode; copy + helper banner adapt accordingly.
 *
 * Players entran al instante. Los clubes pasan por aprobación manual (<24 h).
 *
 * In production:
 *   POST /auth/login { email, password, type: 'player' | 'club' } → { token, user }
 */
export function LoginWithRoleScreen({ onLogin, onRegister, onForgot }: Props) {
  const { colors } = useTheme();
  const [role, setRole] = React.useState<LoginRole>('player');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const isPlayer = role === 'player';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, gap: 18 }}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 18, backgroundColor: '#FFFFFF',
            borderWidth: 1, borderColor: colors.line,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Image source={tornaLogo} style={{ width: 42, height: 42 }} />
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>Ingresa a Torna</Text>
          <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 4 }}>Elige cómo vas a usar la app</Text>
        </View>

        {/* Segmented control */}
        <View style={{
          flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 14, padding: 4, gap: 0,
        }}>
          {([
            { id: 'player', label: 'Soy Player', sub: 'Veo y reservo', Icon: UserIcon },
            { id: 'club',   label: 'Soy Club',   sub: 'Gestiono mi club', Icon: Home },
          ] as { id: LoginRole; label: string; sub: string; Icon: any }[]).map(opt => {
            const on = role === opt.id;
            return (
              <Pressable key={opt.id} onPress={() => setRole(opt.id)}
                style={{
                  flex: 1, borderRadius: 11, paddingVertical: 10,
                  backgroundColor: on ? colors.surface : 'transparent',
                  alignItems: 'center', gap: 4,
                }}>
                <opt.Icon size={18} color={on ? colors.text : colors.muted2} strokeWidth={on ? 2.2 : 1.8}/>
                <Text style={{ fontWeight: '800', fontSize: 13, color: on ? colors.text : colors.muted2 }}>{opt.label}</Text>
                <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{opt.sub}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 10 }}>
          <Input label="Email" icon={<Mail size={18} color={colors.muted2}/>}
            placeholder={isPlayer ? 'tu@email.com' : 'club@padelclub.com'}
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
          <Input label="Contraseña" icon={<Lock size={18} color={colors.muted2}/>}
            placeholder="••••••••" value={pass} onChangeText={setPass}
            secureTextEntry autoCapitalize="none"/>
        </View>

        <Text onPress={onForgot} style={{ alignSelf: 'flex-end', fontSize: 12, fontWeight: '700', color: colors.text }}>
          Olvidé mi contraseña
        </Text>

        <Button fullWidth size="lg" onPress={() => onLogin?.(role)}>
          {isPlayer ? 'Ingresar como Player' : 'Ingresar como Club'}
        </Button>
        <Button fullWidth size="lg" variant="ghost" onPress={() => onRegister?.(role)}>
          {isPlayer ? 'Crear cuenta de Player' : 'Registrar un nuevo club'}
        </Button>

        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: colors.accent, padding: 12, borderRadius: 12,
        }}>
          <AlertTriangle size={16} color={colors.warnFg}/>
          <Text style={{ flex: 1, fontSize: 12, color: colors.warnFg, lineHeight: 17 }}>
            {isPlayer
              ? 'Los Players entran al instante, sin aprobación.'
              : 'Los clubes pasan por aprobación manual del admin (<24h).'}
          </Text>
        </View>

        <View style={{ flex: 1 }}/>
        <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11 }}>
          Versión 1.0.0 · <Text style={{ fontWeight: '700', color: colors.text2 }}>torna</Text>.io
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
