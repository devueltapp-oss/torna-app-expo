/**
 * NearbyClubsMap — mapa interactivo con el usuario + pines de los clubes cercanos,
 * usando OpenStreetMap (Leaflet) dentro de un WebView. Gratis: sin API key, sin
 * billing. Mismo enfoque que `ClubMap` pero con múltiples markers, pan/zoom y
 * markers tappables (postMessage → onSelectClub).
 *
 * Nota: react-native-webview es un módulo nativo → requiere build del dev-client
 * (no funciona en Expo Go). Los tiles de OSM requieren conectividad.
 */
import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MapPin } from 'lucide-react-native';
import { useTheme } from '../theme';

export interface MapClub {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm: number;
}

interface Props {
  userLat: number;
  userLng: number;
  clubs: MapClub[];
  onSelectClub?: (id: string) => void;
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

function leafletHtml(
  userLat: number,
  userLng: number,
  clubs: { id: string; name: string; lat: number; lng: number; km: number }[],
): string {
  const markersJs = clubs
    .map(
      (c) => `
    (function(){
      var m = L.marker([${c.lat}, ${c.lng}]).addTo(map);
      m.bindPopup('${esc(c.name)} · ${c.km.toFixed(1)} km');
      m.on('click', function(){
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('${esc(c.id)}');
      });
      pts.push([${c.lat}, ${c.lng}]);
    })();`,
    )
    .join('\n');

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
    var map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([${userLat}, ${userLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var pts = [[${userLat}, ${userLng}]];

    // Marker "vos" — círculo distinto a los pines de club.
    L.circleMarker([${userLat}, ${userLng}], {
      radius: 8, color: '#2d4c75', weight: 3, fillColor: '#D6FF7E', fillOpacity: 1
    }).addTo(map).bindPopup('Vos');

    ${markersJs}

    if (pts.length > 1) {
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    }
  </script>
</body>
</html>`;
}

export function NearbyClubsMap({ userLat, userLng, clubs, onSelectClub, height = 240, style }: Props) {
  const { colors } = useTheme();

  const located = clubs.filter((c) => isCoord(c.latitude) && isCoord(c.longitude));

  const container: StyleProp<ViewStyle> = [
    { height, overflow: 'hidden', backgroundColor: colors.bg3 },
    style,
  ];

  if (!isCoord(userLat) || !isCoord(userLng)) {
    return (
      <View style={[container, { alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
        <MapPin size={16} color={colors.muted2} />
        <Text style={{ fontSize: 12, color: colors.muted2 }}>Ubicación no disponible</Text>
      </View>
    );
  }

  const onMessage = (e: WebViewMessageEvent) => {
    const id = e.nativeEvent.data;
    if (id) onSelectClub?.(id);
  };

  return (
    <View style={container}>
      <WebView
        style={{ flex: 1, backgroundColor: colors.bg3 }}
        originWhitelist={['*']}
        javaScriptEnabled
        androidLayerType="hardware"
        onMessage={onMessage}
        source={{
          html: leafletHtml(
            userLat,
            userLng,
            located.map((c) => ({
              id: c.id,
              name: c.name,
              lat: c.latitude as number,
              lng: c.longitude as number,
              km: c.distanceKm,
            })),
          ),
          baseUrl: 'https://www.openstreetmap.org',
        }}
      />
    </View>
  );
}
