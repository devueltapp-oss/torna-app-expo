/**
 * CompleteProfileScreen
 *
 * Shown when a social login succeeds at the Firebase/provider level but the
 * user doesn't yet have a Torna backend account (backend returns 404).
 * The user must pick a unique username (validated async against the API)
 * and optionally edit their prefilled name before we call POST /auth/register.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AtSign, User as UserIcon, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';
import { useAuth, type TornaUser, type RegisterDto } from '../contexts/AuthContext';
import { checkUsernameAvailable, USERNAME_RE } from '../api/auth';
import type { LoginRole } from './LoginWithRoleScreen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompleteProfileScreenProps {
  idToken: string;
  prefillName?: string;
  prefillEmail?: string;
  /** `email` = entró con email/contraseña pero no tenía cuenta en Torna. */
  authProvider: 'email' | 'google' | 'apple' | 'facebook';
  /**
   * Rol elegido en el segmented control de LoginWithRole. ⚠️ Decide a qué
   * endpoint/flujo va el alta — ver el comentario de `registerSocialClub` en
   * AuthContext. Sin esto, toda alta que pasaba por acá terminaba siendo un
   * Player, incluso habiendo elegido "Soy Club" (bug real 2026-09-09).
   */
  role: LoginRole;
  onComplete: (user: TornaUser) => void;
  /** Alta de CLUB completada: queda pendiente de aprobación, no logueado. */
  onPending: () => void;
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

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function CompleteProfileScreen({
  idToken,
  prefillName = '',
  prefillEmail,
  authProvider,
  role,
  onComplete,
  onPending,
  onBack,
}: CompleteProfileScreenProps) {
  const { colors } = useTheme();
  const { register, registerSocialClub } = useAuth();

  const [username, setUsername] = useState('');
  const [name, setName] = useState(prefillName);
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

    // Only allow alphanumeric + underscores
    if (!USERNAME_RE.test(raw)) {
      setUsernameStatus('error');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');

    // Ver api/auth.ts: el backend envuelve la respuesta en `{ data }`, así que
    // leer `available` del JSON crudo marcaba todo como ocupado.
    checkUsernameAvailable(raw)
      .then((available) => {
        if (!cancelled) setUsernameStatus(available ? 'available' : 'taken');
      })
      .catch(() => {
        if (!cancelled) setUsernameStatus('error');
      });

    return () => { cancelled = true; };
  }, [debouncedUsername]);

  const canSubmit =
    !isSubmitting &&
    username.trim().length >= 3 &&
    name.trim().length >= 1 &&
    usernameStatus === 'available';

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // ⚠️ Club NO usa `register()` (ese loguea al instante): el club queda
      // `status:false` pendiente de aprobación, así que `registerSocialClub`
      // ni siquiera guarda token — la UI va a Pending, no a la app.
      if (role === 'club') {
        await registerSocialClub(
          idToken,
          { username: username.trim(), name: name.trim() },
          authProvider,
        );
        onPending();
        return;
      }

      const dto: RegisterDto = {
        username: username.trim(),
        name: name.trim(),
        authProvider,
      };

      await register(idToken, dto);

      // After register, useAuth().user is set — pass it up
      // We reconstruct a minimal TornaUser from what we know.
      // The AuthProvider.register() call sets the user in context;
      // the parent (App.tsx) will react to user != null automatically.
      // onComplete is still called for flows that need an explicit callback.
      const completedUser: TornaUser = {
        id: '',            // will be filled by context
        email: prefillEmail ?? '',
        username: username.trim(),
        name: name.trim(),
        isClub: false,
        authProvider,
      };
      onComplete(completedUser);
    } catch (err: any) {
      setSubmitError(
        err?.message ?? 'Ocurrió un error al registrar tu perfil. Intenta de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Username status indicator
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

  const providerLabel: Record<typeof authProvider, string> = {
    email: 'email',
    google: 'Google',
    apple: 'Apple',
    facebook: 'Facebook',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 40,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Back button */}
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
            Completá tu perfil
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted2, lineHeight: 20 }}>
            Tu cuenta de {providerLabel[authProvider]} fue verificada.{'\n'}
            Elige un nombre de usuario para empezar.
          </Text>
          {prefillEmail ? (
            <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>
              {prefillEmail}
            </Text>
          ) : null}
        </View>

        {/* Username field */}
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

        {/* Name field */}
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
          <View
            style={{
              backgroundColor: colors.warnBg,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.warnFg, lineHeight: 18 }}>
              {submitError}
            </Text>
          </View>
        ) : null}

        {/* Mismo aviso que LoginWithRoleScreen para "Soy Club" — acá aplica
            igual: el alta social de un club también pasa por aprobación. */}
        {role === 'club' ? (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 8,
            backgroundColor: colors.accent, padding: 12, borderRadius: 12,
          }}>
            <AlertTriangle size={16} color={colors.warnFg} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.warnFg, lineHeight: 17 }}>
              Tu club queda pendiente de aprobación manual del admin (menos de 24 h) — no vas a
              entrar a la app todavía.
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
          {role === 'club' ? 'Enviar solicitud' : 'Crear mi cuenta'}
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
