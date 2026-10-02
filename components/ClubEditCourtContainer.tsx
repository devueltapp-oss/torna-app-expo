import React from 'react';
import { Alert, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { fetchCourt, updateCourt } from '../api/clubs';
import { fetchClubCameras } from '../api/cameras';
import { ClubEditCourtScreen } from '../screens';
import type { ClubCourtPublic } from '../data/types';
import type { ClubCamera } from '../api/cameras';

/**
 * Editar cancha (club) — SOLO lo que existe en el backend: qué cámaras le
 * pertenecen (`cameraIds`) y si está activa (`isActive`). Trae la cancha
 * (`fetchCourt`, con sus cámaras ya asignadas) y TODAS las cámaras del club
 * (`fetchClubCameras`, mismo cliente que ya usa "Enlazar GoPro") para armar
 * el multi-select.
 */
export function ClubEditCourtContainer({ route, navigation }: { route: any; navigation: any }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [attempt, setAttempt] = React.useState(0);
  const { courtId, liveGameId } = route.params || ({} as any);
  const [court, setCourt] = React.useState<ClubCourtPublic | null>(null);
  const [cameras, setCameras] = React.useState<ClubCamera[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!courtId || user?.isClub !== true) { setLoading(false); return; }
    setLoading(true);
    let active = true;
    Promise.all([fetchCourt(courtId), fetchClubCameras(user)])
      .then(([c, cams]) => { if (active) { setCourt(c); setCameras(cams); } })
      .catch(() => { if (active) { setCourt(null); setCameras([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courtId, user, attempt]);

  if (user?.isClub !== true) return null;
  if (loading || !court) return <View style={{flex:1,backgroundColor:colors.bg,padding:24,justifyContent:'center',gap:16}}>
    {loading ? <ActivityIndicator accessibilityLabel="Cargando cancha"/> : <>
      <Text accessibilityRole="alert" style={{color:colors.text}}>No se pudo cargar la cancha.</Text>
      <Pressable accessibilityRole="button" onPress={()=>setAttempt(n=>n+1)} style={{padding:16}}><Text style={{color:colors.accentText}}>Reintentar</Text></Pressable>
    </>}
    <Pressable accessibilityRole="button" onPress={()=>navigation.goBack()} style={{padding:16}}><Text style={{color:colors.text}}>Volver</Text></Pressable>
  </View>;

  return (
    <ClubEditCourtScreen
      courtName={court.name}
      isActive={court.active ?? true}
      cameraOptions={cameras.map((c) => ({ id: c.id, identifier: c.identifier }))}
      selectedCameraIds={(court.cameras ?? []).map((c) => c.id)}
      liveGameId={liveGameId ?? null}
      onWatchLive={() => navigation.navigate('GameDetail', { gameId: liveGameId })}
      onOpenSchedule={() => navigation.navigate('ClubCourtSchedule', { courtId })}
      onBack={() => navigation.goBack()}
      submitting={submitting}
      onSave={async ({ cameraIds, isActive }) => {
        setSubmitting(true);
        try {
          await updateCourt(user, courtId, { cameraIds, isActive });
          navigation.goBack();
        } catch (e) {
          Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intenta de nuevo.');
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}
