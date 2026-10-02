import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCourtBlocksForDay } from '../hooks/useCourtBlocksForDay';
import { ReserveBlocksScreen, type DayOption } from '../screens';

/** Próximos N días con su ISO (YYYY-MM-DD) — mismo helper que `App.tsx` usa para la reserva del player. */
function buildDays(n = 6): DayOption[] {
  const DOW = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  const pad = (x: number) => String(x).padStart(2, '0');
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DOW[d.getDay()],
      date: String(d.getDate()),
      dow: DOW[d.getDay()],
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    };
  });
}

/**
 * Paso 1 de "Agendar partida" como club — mismo molde que `ClubCamerasContainer`
 * (gate `isClub`, montaje fresco por `key={user.id}`). Reusa `ReserveBlocksScreen`
 * TAL CUAL (mismas reglas de bloque libre/multibloque que ya usa el desktop
 * para este mismo caso de uso): el único punto propio es a qué ruta navega
 * `onContinue`.
 */
export function ClubCreateGameContainer({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  return user?.isClub === true ? <ClubCreateGame key={user.id} clubId={user.id} navigation={navigation} /> : null;
}

function ClubCreateGame({ clubId, navigation }: { clubId: string; navigation: any }) {
  const days = React.useMemo(() => buildDays(6), []);
  const { clubName, clubLoc, courts, courtSlots, loading, loadSlots } = useCourtBlocksForDay(clubId, days);

  return (
    <ReserveBlocksScreen
      clubName={clubName}
      latitude={clubLoc.lat}
      longitude={clubLoc.lng}
      courtSlots={courtSlots}
      loading={loading}
      days={days}
      onBack={() => navigation.goBack()}
      onDayChange={(d) => loadSlots(d.iso, courts)}
      onContinue={({ court, slot, day }) => navigation.navigate('ClubAssignPlayers', {
        courtId: court.id,
        courtLabel: court.name,
        cameraOptions: court.cameras ?? [],
        date: day.iso ?? '',
        slotStart: slot.start,
        slotEnd: slot.end,
        durationMinutes: slot.duration,
      })}
    />
  );
}
