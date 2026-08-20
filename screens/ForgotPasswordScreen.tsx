/**
 * ForgotPasswordScreen
 *
 * Recuperación de contraseña. Es **100% client-side contra Firebase**
 * (`sendPasswordResetEmail`): el backend no participa. El endpoint
 * `POST /auth/reset-password` de torna-api NO sirve acá — está detrás de
 * `FirebaseAuthGuard`, o sea que exige estar logueado, justo lo que no puede
 * hacer alguien que olvidó la contraseña.
 *
 * Privacidad: **no revelamos si el email existe**. El mensaje de éxito es el
 * mismo haya cuenta o no (Firebase, con protección de enumeración de emails
 * activada, tampoco distingue). Solo se muestran errores de formato,
 * rate-limit y red.
 *
 * Cuentas de Google/Apple: no tienen contraseña. El mail de Firebase igual les
 * permite crear una, así que el copy lo aclara en vez de bloquear el flujo.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MailCheck, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export interface ForgotPasswordScreenProps {
  /** Email tipeado en el login, para no obligar a escribirlo de nuevo. */
  prefillEmail?: string;
  onBack: () => void;
}

/** Validación mínima de formato — el resto lo valida Firebase. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function friendlyResetError(err: any): string {
  const msg: string = err?.code ?? err?.message ?? '';

  if (msg.includes('invalid-email')) return 'Ese email no tiene un formato válido.';
  if (msg.includes('too-many-requests')) {
    return 'Demasiados intentos. Esperá unos minutos y volvé a intentar.';
  }
  if (msg.includes('network') || msg.includes('Network')) {
    return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
  }
  // `user-not-found` a propósito NO se traduce: no delatamos qué emails existen.
  return 'No pudimos enviar el correo. Intentá de nuevo en un momento.';
}

export function ForgotPasswordScreen({ prefillEmail, onBack }: ForgotPasswordScreenProps) {
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState(prefillEmail ?? '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const value = email.trim();
    if (!looksLikeEmail(value)) {
      setError('Escribí un email válido.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(value);
      setSent(true);
    } catch (err) {
      // user-not-found llega acá y se muestra genérico a propósito (ver arriba).
      if (String((err as any)?.code ?? '').includes('user-not-found')) {
        setSent(true);
      } else {
        setError(friendlyResetError(err));
      }
    } finally {
      setLoading(false);
    }
  }

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
      >
        {/* Back */}
        <Pressable
          onPress={onBack}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Volver</Text>
        </Pressable>

        {sent ? (
          <>
            {/* Confirmación — mismo texto exista o no la cuenta */}
            <View style={{ gap: 6 }}>
              <MailCheck size={40} color={colors.accentText} strokeWidth={2} />
              <Text
                style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}
              >
                Revisá tu correo
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted2, lineHeight: 20 }}>
                Si hay una cuenta asociada a{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>{email.trim()}</Text>, te
                enviamos un enlace para crear una contraseña nueva. El enlace vence en unas horas.
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted2, lineHeight: 19, marginTop: 4 }}>
                ¿No lo ves? Fijate en spam o correo no deseado. Si entraste con Google o Apple, tu
                cuenta no tenía contraseña — el mismo enlace te deja crear una.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              <Button fullWidth size="lg" onPress={onBack}>
                Volver al inicio de sesión
              </Button>
              <Pressable onPress={() => setSent(false)} disabled={loading}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: colors.accentText,
                    textAlign: 'center',
                  }}
                >
                  Usar otro email
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text
                style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }}
              >
                Recuperar contraseña
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted2, lineHeight: 20 }}>
                Escribí el email de tu cuenta y te mandamos un enlace para crear una contraseña
                nueva.
              </Text>
            </View>

            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={(v: string) => {
                setEmail(v);
                setError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              icon={<Mail size={18} color={colors.muted2} strokeWidth={2} />}
            />

            {error ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  backgroundColor: colors.warnBg,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <AlertTriangle size={18} color={colors.warnFg} strokeWidth={2} />
                <Text style={{ flex: 1, fontSize: 13, color: colors.warnFg }}>{error}</Text>
              </View>
            ) : null}

            <Button
              fullWidth
              size="lg"
              variant={loading ? 'disabled' : 'primary'}
              loading={loading}
              onPress={handleSend}
            >
              Enviarme el enlace
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
