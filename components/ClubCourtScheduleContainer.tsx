import React from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCourt, fetchCourtSchedule, updateCourtSchedule,
  fetchCourtExceptions, createCourtException, deleteCourtException,
} from '../api/clubs';
import { normalizeDays, formatExceptionDate, type DaySchedule } from '../lib/schedule';
import { ClubCourtScheduleScreen, type ScheduleExceptionItem } from '../screens';

function buildUpcomingDates(n: number) {
  const pad = (x: number) => String(x).padStart(2, '0');
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { iso, label: i === 0 ? 'Hoy' : formatExceptionDate(iso) };
  });
}

/**
 * Horarios de cancha (club) — trae el horario semanal + las excepciones ya
 * guardadas, y persiste los dos contra el mismo backend que usa el desktop
 * (`ScheduleDialog.jsx`/`ExceptionsDialog.jsx`). POR CANCHA individual.
 */
export function ClubCourtScheduleContainer({ route, navigation }: { route: any; navigation: any }) {
  const { user } = useAuth();
  const { courtId } = route.params || ({} as any);
  const [courtName, setCourtName] = React.useState('');
  const [days, setDays] = React.useState<DaySchedule[] | null>(null);
  // Se preservan tal cual al guardar el horario semanal: el endpoint es un
  // reemplazo completo (PUT), no parcial — perderlos los resetearía.
  const [blockMinutes, setBlockMinutes] = React.useState(60);
  const [pricePerBlock, setPricePerBlock] = React.useState(0);
  const [exceptions, setExceptions] = React.useState<ScheduleExceptionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingWeek, setSavingWeek] = React.useState(false);
  const [savingException, setSavingException] = React.useState(false);
  const upcomingDates = React.useMemo(() => buildUpcomingDates(60), []);

  const load = React.useCallback(() => {
    if (!courtId || user?.isClub !== true) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetchCourt(courtId),
      fetchCourtSchedule(courtId).catch(() => null),
      fetchCourtExceptions(courtId).catch(() => []),
    ]).then(([court, schedule, exc]) => {
      setCourtName(court.name);
      setBlockMinutes(schedule?.blockMinutes ?? court.blockMinutes ?? 60);
      setPricePerBlock(schedule?.pricePerBlock ?? court.pricePerBlock ?? 0);
      setDays(normalizeDays(schedule?.days));
      setExceptions(exc);
    }).catch(() => { setDays(normalizeDays(null)); }).finally(() => setLoading(false));
  }, [courtId, user]);
  React.useEffect(() => { load(); }, [load]);

  if (user?.isClub !== true) return null;
  if (loading || !days) return null; // TODO: estado de carga visual si hace falta más adelante

  return (
    <ClubCourtScheduleScreen
      courtName={courtName}
      days={days}
      exceptions={exceptions}
      upcomingDates={upcomingDates}
      savingWeek={savingWeek}
      savingException={savingException}
      onBack={() => navigation.goBack()}
      onSaveWeek={async (newDays) => {
        setSavingWeek(true);
        try {
          await updateCourtSchedule(user, courtId, { blockMinutes, pricePerBlock, days: newDays });
          setDays(newDays);
        } catch (e) {
          Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Intenta de nuevo.');
        } finally {
          setSavingWeek(false);
        }
      }}
      onAddException={async (input) => {
        setSavingException(true);
        try {
          const created = await createCourtException(user, courtId, input);
          setExceptions((xs) => [...xs.filter((x) => x.date !== created.date), created].sort((a, b) => a.date.localeCompare(b.date)));
        } catch (e) {
          Alert.alert('No se pudo guardar la excepción', e instanceof Error ? e.message : 'Intenta de nuevo.');
        } finally {
          setSavingException(false);
        }
      }}
      onDeleteException={async (date) => {
        const prev = exceptions;
        setExceptions((xs) => xs.filter((x) => x.date !== date));
        try {
          await deleteCourtException(user, courtId, date);
        } catch (e) {
          setExceptions(prev);
          Alert.alert('No se pudo quitar', e instanceof Error ? e.message : 'Intenta de nuevo.');
        }
      }}
    />
  );
}
