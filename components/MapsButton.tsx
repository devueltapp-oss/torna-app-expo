/**
 * MapsButton — botón "Buscar en Maps" que abre Google Maps (universal) en la
 * ubicación dada, usando las coordenadas almacenadas del club.
 *
 * Reemplaza los mapas embebidos (Leaflet/WebView/MapTiler): en vez de renderizar
 * un mapa dentro de la app, referenciamos el lugar en Google Maps vía Linking.
 * La URL universal abre la app de Google Maps si está instalada, o el navegador,
 * igual en iOS y Android.
 *
 * Si no hay coordenadas pero sí una dirección/nombre (`query`), busca por texto.
 * Si no hay ninguno, muestra "Ubicación no disponible".
 */
import React from 'react';
import { View, Text, Pressable, Linking, StyleProp, ViewStyle } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '../theme';

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  /** Fallback de búsqueda por texto (dirección o nombre) si no hay coordenadas. */
  query?: string;
  label?: string;
  /** Versión compacta (pill chica) para cards; por defecto es full-width. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

function isCoord(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n !== 0;
}

/** URL universal de Google Maps a partir de coords o texto; null si no hay nada. */
function mapsUrl(lat?: number | null, lng?: number | null, query?: string): string | null {
  if (isCoord(lat) && isCoord(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (query && query.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
}

export function MapsButton({ latitude, longitude, query, label = 'Buscar en Maps', compact, style }: Props) {
  const { colors } = useTheme();
  const url = mapsUrl(latitude, longitude, query);

  if (!url) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }, style]}>
        <MapPin size={14} color={colors.muted2} />
        <Text style={{ fontSize: 12, color: colors.muted2 }}>Ubicación no disponible</Text>
      </View>
    );
  }

  const open = () => { Linking.openURL(url).catch(() => {}); };

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
          backgroundColor: colors.accent, borderRadius: compact ? 9999 : 12,
          paddingVertical: compact ? 7 : 11,
          paddingHorizontal: compact ? 12 : 14,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Navigation size={compact ? 12 : 15} color={colors.ink} />
      <Text style={{ fontSize: compact ? 11 : 13, fontWeight: '800', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}
