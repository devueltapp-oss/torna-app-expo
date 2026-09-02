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
import { Pressable, Text, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button } from './ui';

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
        // Superficie NEUTRA (`bg2`), no `accentSoft`.
        //
        // ⚠️ `accentSoft` es lima al 18 % y `accentText` es lima **sólida** en
        // tema oscuro: eso deja texto lima sobre un fondo lima y no se lee. Los
        // pares seguros del design system son texto sobre `bg2`/`surface`, o
        // `colors.ink` sobre lima sólida — que es justo lo que hace `Button`.
        backgroundColor: colors.bg2,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        marginBottom: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {/* El lima queda para el ícono, que no tiene que leerse: tiene que verse. */}
        <MapPin size={18} color={colors.accent} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.text }}>
            ¿Te avisamos cuando publiquen una partida cerca tuyo?
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted2, marginTop: 3, lineHeight: 17 }}>
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
          <X size={16} color={colors.muted2} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* `Button variant="accent"` = lima sólida + texto `colors.ink` (azul).
            Es el par de contraste que ya usa toda la app; escribirlo a mano fue
            lo que produjo letras casi transparentes sobre el botón. */}
        <Button variant="accent" size="sm" loading={loading} onPress={onEnable}>
          Activar
        </Button>

        <Pressable onPress={onDismiss} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontSize: 13, color: colors.muted2 }}>No, gracias</Text>
        </Pressable>
      </View>
    </View>
  );
}
