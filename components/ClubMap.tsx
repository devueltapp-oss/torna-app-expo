/**
 * ClubMap — muestra la ubicación de un club en un mapa real, usando
 * OpenStreetMap (Leaflet) dentro de un WebView. Es 100% gratis: sin API key,
 * sin billing. Ideal para MVP (solo mostrar el pin del local).
 *
 * Si el club no tiene coordenadas, muestra un fallback "Ubicación no disponible".
 * Tocar "Cómo llegar" abre la app de mapas nativa.
 *
 * Nota: react-native-webview es un módulo nativo → requiere build del dev-client
 * (no funciona en Expo Go). Los tiles de OSM requieren conectividad.
 */
import React from 'react';
import { View, Text, Pressable, Linking, Platform, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '../theme';

interface Props {
  latitude?: number | null;
  longitude?: number | null;
  title?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

function isCoord(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n !== 0;
}

/** Escapa comillas/backslashes para interpolar texto seguro en el HTML/JS. */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '&lt;');
}

/** HTML con Leaflet + tiles OSM mostrando un pin no interactivo en (lat,lng). */
function leafletHtml(lat: number, lng: number, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;background:transparent}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false, dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false, keyboard: false, boxZoom: false, tap: false,
      attributionControl: true
    }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.marker([${lat}, ${lng}]).addTo(map)${title ? `.bindPopup('${esc(title)}')` : ''};
  </script>
</body>
</html>`;
}

export function ClubMap({ latitude, longitude, title, height = 120, style }: Props) {
  const { colors } = useTheme();
  const hasCoords = isCoord(latitude) && isCoord(longitude);

  const container: StyleProp<ViewStyle> = [
    { height, overflow: 'hidden', backgroundColor: colors.bg3 },
    style,
  ];

  if (!hasCoords) {
    return (
      <View style={[container, { alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
        <View style={{
          width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg2,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <MapPin size={14} color={colors.muted2} />
        </View>
        <Text style={{ fontSize: 12, color: colors.muted2 }}>Ubicación no disponible</Text>
      </View>
    );
  }

  const openMaps = () => {
    const label = encodeURIComponent(title ?? 'Club');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      default: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={container}>
      <WebView
        style={{ flex: 1, backgroundColor: colors.bg3 }}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={false}
        androidLayerType="hardware"
        source={{
          html: leafletHtml(latitude as number, longitude as number, title ?? ''),
          baseUrl: 'https://www.openstreetmap.org',
        }}
      />

      {/* CTA "Cómo llegar" — abre la app de mapas nativa */}
      <Pressable
        onPress={openMaps}
        style={{
          position: 'absolute', bottom: 8, right: 8,
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999,
        }}
      >
        <Navigation size={12} color={colors.accentText} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Cómo llegar</Text>
      </Pressable>
    </View>
  );
}
