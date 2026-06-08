import React from 'react';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User as UserIcon, Home, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input, SocialButton } from '../components/ui';
import { useAuth, type LoginResult } from '../contexts/AuthContext';

const tornaLogo = require('../assets/torna-icon.png');

export type LoginRole = 'player' | 'club';

interface Props {
  /** Called after a successful login — receives the role so App.tsx can route correctly. */
  onLogin?: (role: LoginRole) => void;
  /** Called when the user wants to register (no social token involved). */
  onRegister?: (role: LoginRole) => void;
  /** Called when a social login returns needs_registration. */
  onNeedsRegistration?: (result: LoginResult & { status: 'needs_registration' }, provider: 'google' | 'apple' | 'facebook') => void;
  onForgot?: () => void;
}

/**
 * Login with role-picker. Segmented control toggles between Player and Club
 * mode; copy + helper banner adapt accordingly.
 *
 * Auth wiring:
 *   - Email/password → AuthContext.loginWithEmailPassword()
 *   - Google / Apple / Facebook → AuthContext.loginWithGoogle/Apple/Facebook()
 *   - Result 'needs_registration' → navigates to CompleteProfileScreen via onNeedsRegistration
 *   - Result 'authenticated' → onLogin(role)
 *
 * Error messages are rendered inline (no alert dialogs).
 */
export function LoginWithRoleScreen({ onLogin, onRegister, onNeedsRegistration, onForgot }: Props) {
  const { colors } = useTheme();
  const { loginWithEmailPassword, loginWithGoogle, loginWithApple, isLoading: authLoading } = useAuth();

  const [role, setRole] = React.useState<LoginRole>('player');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [socialLoading, setSocialLoading] = React.useState<'google' | 'apple' | null>(null);

  const isPlayer = role === 'player';
  const isBusy = loading || socialLoading !== null;

  // ------------------------------------------------------------------
  // Email / password login
  // ------------------------------------------------------------------
  async function handleEmailLogin() {
    if (!email.trim() || !pass) {
      setError('Completá el email y la contraseña.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithEmailPassword(email.trim(), pass);
      // AuthProvider sets user; App.tsx will switch to AppStack automatically.
      // onLogin is also called so App.tsx can know the role (since TornaUser.isClub is the truth).
      onLogin?.(role);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Social login helpers
  // ------------------------------------------------------------------
  async function handleSocial(provider: 'google' | 'apple') {
    setError(null);
    setSocialLoading(provider);
    try {
      const result: LoginResult = provider === 'google'
        ? await loginWithGoogle()
        : await loginWithApple();

      if (result.status === 'authenticated') {
        onLogin?.(result.user.isClub ? 'club' : 'player');
      } else {
        onNeedsRegistration?.(result, provider);
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 24,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 18, backgroundColor: '#FFFFFF',
            borderWidth: 1, borderColor: colors.line,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Image source={tornaLogo} style={{ width: 42, height: 42 }} />
          </View>
        </View>

        {/* Title */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
            Ingresa a Torna
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 4 }}>
            Elige cómo vas a usar la app
          </Text>
        </View>

        {/* Role segmented control */}
        <View style={{
          flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 14, padding: 4,
        }}>
          {([
            { id: 'player', label: 'Soy Player',  sub: 'Veo y reservo',     Icon: UserIcon },
            { id: 'club',   label: 'Soy Club',    sub: 'Gestiono mi club',  Icon: Home },
          ] as { id: LoginRole; label: string; sub: string; Icon: any }[]).map(opt => {
            const on = role === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => { setRole(opt.id); setError(null); }}
                style={{
                  flex: 1, borderRadius: 11, paddingVertical: 10,
                  backgroundColor: on ? colors.surface : 'transparent',
                  alignItems: 'center', gap: 4,
                }}
              >
                <opt.Icon size={18} color={on ? colors.text : colors.muted2} strokeWidth={on ? 2.2 : 1.8} />
                <Text style={{ fontWeight: '800', fontSize: 13, color: on ? colors.text : colors.muted2 }}>
                  {opt.label}
                </Text>
                <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{opt.sub}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Email + password */}
        <View style={{ gap: 10 }}>
          <Input
            label="Email"
            icon={<Mail size={18} color={colors.muted2} />}
            placeholder={isPlayer ? 'tu@email.com' : 'club@padelclub.com'}
            value={email}
            onChangeText={v => { setEmail(v); setError(null); }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Contraseña"
            icon={<Lock size={18} color={colors.muted2} />}
            placeholder="••••••••"
            value={pass}
            onChangeText={v => { setPass(v); setError(null); }}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* Forgot password */}
        <Text
          onPress={onForgot}
          style={{ alignSelf: 'flex-end', fontSize: 12, fontWeight: '700', color: colors.text }}
        >
          Olvidé mi contraseña
        </Text>

        {/* Inline error */}
        {error ? (
          <View style={{
            backgroundColor: colors.warnBg,
            borderRadius: 10,
            padding: 12,
          }}>
            <Text style={{ fontSize: 13, color: colors.warnFg, lineHeight: 18 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Primary CTA */}
        <Button
          fullWidth
          size="lg"
          variant={isBusy ? 'disabled' : 'primary'}
          loading={loading}
          onPress={handleEmailLogin}
        >
          {isPlayer ? 'Ingresar como Player' : 'Ingresar como Club'}
        </Button>

        {/* Register ghost CTA */}
        <Button
          fullWidth
          size="lg"
          variant="ghost"
          onPress={() => onRegister?.(role)}
        >
          {isPlayer ? 'Crear cuenta de Player' : 'Registrar un nuevo club'}
        </Button>

        {/* Social divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>o continuá con</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        </View>

        {/* Social buttons */}
        <View style={{ gap: 10 }}>
          <SocialButton
            provider="google"
            label="Continuar con Google"
            loading={socialLoading === 'google'}
            disabled={isBusy}
            onPress={() => handleSocial('google')}
          />
          <SocialButton
            provider="apple"
            label="Continuar con Apple"
            loading={socialLoading === 'apple'}
            disabled={isBusy}
            onPress={() => handleSocial('apple')}
          />
        </View>

        {/* Info banner */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
          backgroundColor: colors.accent, padding: 12, borderRadius: 12,
        }}>
          <AlertTriangle size={16} color={colors.warnFg} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.warnFg, lineHeight: 17 }}>
            {isPlayer
              ? 'Los Players entran al instante, sin aprobación.'
              : 'Los clubes pasan por aprobación manual del admin (<24h).'}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 11 }}>
          Versión 1.0.0 · <Text style={{ fontWeight: '700', color: colors.text2 }}>torna</Text>.io
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Error message helper
// ---------------------------------------------------------------------------

function friendlyError(err: any): string {
  const msg: string = err?.message ?? '';

  // Firebase / backend common codes
  if (msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('401')) {
    return 'Email o contraseña incorrectos.';
  }
  if (msg.includes('user-not-found') || msg.includes('404')) {
    return 'No encontramos una cuenta con ese email.';
  }
  if (msg.includes('too-many-requests') || msg.includes('429')) {
    return 'Demasiados intentos. Esperá unos minutos y volvé a intentar.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Network')) {
    return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
  }
  if (msg.includes('instala') || msg.includes('no disponible')) {
    // SDK not yet installed — be transparent
    return msg;
  }

  return msg || 'Ocurrió un error inesperado. Intentá de nuevo.';
}
