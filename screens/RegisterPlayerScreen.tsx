/**
 * RegisterPlayerScreen
 *
 * Alta de Player por email/contraseña. A diferencia del club, el player NO
 * pasa por aprobación: el backend lo crea con status=true y queda logueado al
 * instante (AuthProvider setea user → App.tsx cambia al AppStack solo).
 *
 * Flujo:
 *   email + password + username (validado contra /auth/check-username) + nombre
 *   → AuthContext.registerWithEmailPassword()
 *       → Firebase createUserWithEmailAndPassword → idToken
 *       → POST /auth/register { authProvider:'email', isClub:false }
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, AtSign, User as UserIcon, Mail, Lock,
  CheckCircle2, XCircle,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export interface RegisterPlayerScreenProps {
  onBack: () => void;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Debounce helper
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function RegisterPlayerScreen({ onBack }: RegisterPlayerScreenProps) {
  const { colors } = useTheme();
  const { registerWithEmailPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedUsername = useDebounce(username.trim(), 400);

  // Async username availability check
  useEffect(() => {
    const raw = debouncedUsername;

    if (!raw || raw.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(raw)) {
      setUsernameStatus('error');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');

    fetch(`${API_URL}/auth/check-username?username=${encodeURIComponent(raw)}`)
      .then(r => r.json())
      .then((data: { available: boolean }) => {
        if (!cancelled) setUsernameStatus(data.available ? 'available' : 'taken');
      })
      .catch(() => {
        if (!cancelled) setUsernameStatus('error');
      });

    return () => { cancelled = true; };
  }, [debouncedUsername]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const canSubmit =
    !isSubmitting &&
    emailValid &&
    password.length >= 8 &&
    username.trim().length >= 3 &&
    name.trim().length >= 1 &&
    usernameStatus === 'available';

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await registerWithEmailPassword(email.trim(), password, {
        username: username.trim(),
        name: name.trim(),
        isClub: false,
      });
      // AuthProvider setea user → Root cambia al AppStack automáticamente.
    } catch (err: any) {
      setSubmitError(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function UsernameIndicator() {
    if (username.trim().length < 3) return null;

    if (usernameStatus === 'checking') {
      return <ActivityIndicator size="small" color={colors.muted2} style={{ alignSelf: 'flex-start' }} />;
    }
    if (usernameStatus === 'available') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <CheckCircle2 size={14} color={colors.ink} strokeWidth={2} />
          <Text style={{ fontSize: 12, color: colors.ink, fontWeight: '600' }}>Disponible</Text>
        </View>
      );
    }
    if (usernameStatus === 'taken') {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <XCircle size={14} color={colors.danger} strokeWidth={2} />
          <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '600' }}>Ya está tomado</Text>
        </View>
      );
    }
    if (usernameStatus === 'error') {
      return (
        <Text style={{ fontSize: 12, color: colors.danger, marginTop: 2 }}>
          Solo letras, números y guiones bajos
        </Text>
      );
    }
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 40,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable
          onPress={onBack}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Volver</Text>
        </Pressable>

        {/* Header */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}>
            Crear cuenta de Player
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted2, lineHeight: 20 }}>
            Entrás al instante, sin aprobación. Empezá a ver y reservar.
          </Text>
        </View>

        {/* Email */}
        <Input
          label="Email"
          icon={<Mail size={18} color={colors.muted2} />}
          placeholder="tu@email.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setSubmitError(null); }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Password */}
        <Input
          label="Contraseña"
          icon={<Lock size={18} color={colors.muted2} />}
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChangeText={(v) => { setPassword(v); setSubmitError(null); }}
          secureTextEntry
          autoCapitalize="none"
          hint="8+ caracteres."
        />

        {/* Username */}
        <View style={{ gap: 6 }}>
          <Input
            label="Nombre de usuario"
            icon={<AtSign size={18} color={colors.muted2} />}
            placeholder="ej: maxi_padel"
            value={username}
            onChangeText={(v) => {
              setUsername(v.toLowerCase().replace(/\s/g, '_'));
              setUsernameStatus('idle');
            }}
            autoCapitalize="none"
            error={
              usernameStatus === 'taken'
                ? 'Ese nombre ya está en uso'
                : usernameStatus === 'error'
                ? 'Solo letras, números y guiones bajos'
                : null
            }
          />
          <UsernameIndicator />
        </View>

        {/* Name */}
        <Input
          label="Nombre completo"
          icon={<UserIcon size={18} color={colors.muted2} />}
          placeholder="Tu nombre"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Submit error */}
        {submitError ? (
          <View style={{ backgroundColor: colors.warnBg, borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 13, color: colors.warnFg, lineHeight: 18 }}>
              {submitError}
            </Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <Button
          fullWidth
          size="lg"
          variant={canSubmit ? 'primary' : 'disabled'}
          loading={isSubmitting}
          onPress={handleSubmit}
        >
          Crear mi cuenta
        </Button>

        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.muted, lineHeight: 16 }}>
          Al continuar aceptás los{' '}
          <Text style={{ fontWeight: '700', color: colors.text2 }}>Términos de servicio</Text>
          {' '}de Torna.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Error helper — mapea códigos de Firebase / backend a mensajes legibles
// ---------------------------------------------------------------------------

function friendlyError(err: any): string {
  const msg: string = err?.message ?? err?.code ?? '';

  if (msg.includes('email-already-in-use')) {
    return 'Ya existe una cuenta con ese email. Probá iniciando sesión.';
  }
  if (msg.includes('invalid-email')) {
    return 'El email no es válido.';
  }
  if (msg.includes('weak-password')) {
    return 'La contraseña es muy débil. Usá al menos 8 caracteres.';
  }
  if (msg.includes('username') || msg.includes('usuario ya')) {
    return 'Ese nombre de usuario ya está en uso.';
  }
  if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch')) {
    return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
  }
  return msg || 'No se pudo crear la cuenta. Intentá de nuevo.';
}
