import React from 'react';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../contexts/AuthContext';
import { searchUsers } from '../api/users';
import { createClubGame } from '../api/games';
import { formatClubDate, toClubIsoLabel } from '../lib/clubTime';
import { ClubAssignPlayersScreen } from '../screens';
import type { InvitablePlayer } from '../data/types';

function atHandle(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Paso 2 de "Agendar partida" como club. `onSearchPlayers` usa `searchUsers`
 * (GET /user/search) y NO `searchUsersAndClubs`: el club asigna jugadores
 * reales, nunca otro club — mismo filtro que ya usa `CreateGameDialog.jsx`
 * del desktop con `GET /user/search`.
 *
 * ⚠️ **Bug real (2026-10-03)**: tras crear, esto navegaba a una pantalla de
 * "¡listo!" estática y la cámara elegida acá quedaba adjunta a la partida
 * SIN estar conectada (sin WiFi/COHN ni stream arrancado) — la partida
 * aparecía como "DETENIDA" con un link de streaming que no existe. El
 * siguiente paso real es `ClubPrepareGame` (ya construido para esto: elegir
 * cámaras → conectarlas al WiFi → revisar encuadre, "no pone la partida en
 * vivo"), así que ahora se navega ahí con la partida recién creada en vez de
 * abandonar al club en una pantalla sin salida útil.
 */
export function ClubAssignPlayersContainer({ route, navigation }: { route: any; navigation: any }) {
  const { user } = useAuth();
  const { courtId, courtLabel, cameraOptions, date, slotStart, slotEnd, durationMinutes } = route.params || ({} as any);
  const [submitting, setSubmitting] = React.useState(false);

  if (user?.isClub !== true) return null;

  return (
    <ClubAssignPlayersScreen
      summary={{
        title: courtLabel || 'Cancha',
        date: formatClubDate(date) || date,
        time: `${slotStart}–${slotEnd} · ${durationMinutes} min`,
      }}
      cameraOptions={cameraOptions ?? []}
      submitting={submitting}
      onBack={() => navigation.goBack()}
      onSearchPlayers={async (q) => {
        const res = await searchUsers(q);
        return res.map((u): InvitablePlayer => ({ id: u.id, name: u.name ?? u.username, username: atHandle(u.username) }));
      }}
      onConfirm={async ({ cameraIds, playerIds, category }) => {
        if (submitting) return;
        setSubmitting(true);
        try {
          const jobId = Crypto.randomUUID();
          const scheduledStartAt = toClubIsoLabel(date, slotStart);
          const scheduledEndAt = toClubIsoLabel(date, slotEnd);
          const created = await createClubGame(
            user,
            { jobId, cameraIds, courtId, scheduledStartAt, scheduledEndAt, category },
            playerIds.map((userId) => ({ userId })),
          );
          // Reset (no push/replace): descarta todo el flujo de agendar
          // (bloque + jugadores) del stack, así "Volver a las partidas" desde
          // ClubPrepareGame aterriza en Juegos, no en una pantalla de pasos ya
          // completados.
          navigation.reset({
            index: 1,
            routes: [
              { name: 'MainClub', params: { initialTab: 'games' } },
              { name: 'ClubPrepareGame', params: { gameId: created.id } },
            ],
          });
        } catch (e) {
          Alert.alert(
            'No se pudo crear la partida',
            e instanceof Error ? e.message : 'Intenta de nuevo.',
          );
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}
