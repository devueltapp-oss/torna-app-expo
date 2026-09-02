/**
 * NearbyPromptCard — ofrece activar el aviso de partidas abiertas cercanas.
 *
 * ## Por qué existe
 *
 * El aviso es **opt-in y arranca apagado**, y el permiso de ubicación lo pide
 * únicamente el toggle de Ajustes. Eso está bien (iOS da **un solo prompt por
 * instalación**: pedirlo en el login, antes de que el usuario sepa para qué,
 * lo quema y un "no" ahí es definitivo).
 *
 * El problema es el otro: **nadie va a Ajustes a buscar una función que no sabe
 * que existe**. Sin este ofrecimiento la feature queda disponible y muerta.
 *
 * ## Por qué va acá y no en el login
 *
 * Se muestra sobre "Abiertos para sumarme", que es exactamente la lista que el
 * aviso completa: el usuario está mirando partidas abiertas y le proponemos que
 * le avisemos de las próximas. El valor se explica solo, y el prompt del sistema
 * sale en el único momento en que se entiende.
 *
 * Descartarla es definitivo (se persiste): insistir con algo que ya se rechazó
 * es cómo una app se gana que la silencien.
 */
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';

export interface NearbyPromptCardProps {
  /** Km del radio, para que el copy no invente un número. Lo manda el backend. */
  radiusKm?: number;
  loading?: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function NearbyPromptCard({
  radiusKm = 25,
  loading,
  onEnable,
  onDismiss,
}: NearbyPromptCardProps) {
  const { colors } = useTheme();

  return (
    <View
      testID="nearby-prompt"
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        marginBottom: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <MapPin size={18} color={colors.accentText} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.accentText }}>
            ¿Te avisamos cuando publiquen una partida cerca tuyo?
          </Text>
          <Text style={{ fontSize: 12, color: colors.accentText, opacity: 0.85, marginTop: 3 }}>
            Te llega una notificación si alguien busca rivales a menos de {radiusKm} km.
            Tu ubicación no se muestra a nadie.
          </Text>
        </View>

        {/* Descartar también arriba: la X es donde la gente la busca. */}
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityLabel="Descartar"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <X size={16} color={colors.accentText} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={loading ? undefined : onEnable}
          style={({ pressed }) => ({
            backgroundColor: colors.accentText,
            borderRadius: 10,
            paddingVertical: 9,
            paddingHorizontal: 18,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.accentSoft} />
          ) : (
            <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.accentSoft }}>
              Activar
            </Text>
          )}
        </Pressable>

        <Pressable onPress={onDismiss} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontSize: 13, color: colors.accentText, opacity: 0.9 }}>No, gracias</Text>
        </Pressable>
      </View>
    </View>
  );
}
