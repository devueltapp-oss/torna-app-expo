import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Button, AppHeader, Switch } from '../components/ui';
import { TimePickerSheet } from '../components/TimePickerSheet';
import { DAY_LABELS, minuteToLabel, formatExceptionDate, type DaySchedule } from '../lib/schedule';

export interface ScheduleExceptionItem {
  date: string; // 'YYYY-MM-DD'
  isOpen: boolean;
  openMinute?: number;
  closeMinute?: number;
}

export interface ClubCourtScheduleScreenProps {
  courtName: string;
  days: DaySchedule[]; // 7 entradas, dayOfWeek 0-6
  exceptions: ScheduleExceptionItem[];
  /** Próximas N fechas para elegir al agregar una excepción (chips horizontales). */
  upcomingDates: { iso: string; label: string }[];
  onBack?: () => void;
  onSaveWeek: (days: DaySchedule[]) => void;
  onAddException: (input: ScheduleExceptionItem) => void;
  onDeleteException: (date: string) => void;
  savingWeek?: boolean;
  savingException?: boolean;
}

type TimeField = { dayOfWeek: number; field: 'openMinute' | 'closeMinute' } | { exception: true; field: 'openMinute' | 'closeMinute' };

/**
 * Horarios de la cancha (club, 2026-10-02) — semanal + excepciones por fecha,
 * mismo modelo que `ScheduleDialog.jsx`/`WeeklyScheduleFields.jsx` y
 * `ExceptionsDialog.jsx` del desktop. POR CANCHA individual (no hay "horario
 * del club entero" del lado del backend).
 */
export function ClubCourtScheduleScreen({
  courtName, days: initialDays, exceptions, upcomingDates,
  onBack, onSaveWeek, onAddException, onDeleteException,
  savingWeek = false, savingException = false,
}: ClubCourtScheduleScreenProps) {
  const { colors } = useTheme();
  // Mismo bug/fix que `ReserveBlocksScreen`/`BottomTabBar`: la hoja de
  // excepción es `position:'absolute', bottom:0` fuera del SafeAreaView
  // (`edges:['top']`), con padding fijo que Android edge-to-edge tapa con
  // la barra/gestos del sistema.
  const insets = useSafeAreaInsets();
  const sheetPaddingBottom = Platform.OS === 'ios' ? insets.bottom + 16 : Math.max(insets.bottom, 16);
  const [days, setDays] = React.useState<DaySchedule[]>(initialDays);
  const [timeField, setTimeField] = React.useState<TimeField | null>(null);

  const [exceptionOpen, setExceptionOpen] = React.useState(false);
  const [exDate, setExDate] = React.useState<string | null>(null);
  const [exIsOpen, setExIsOpen] = React.useState(false);
  const [exOpenMinute, setExOpenMinute] = React.useState(8 * 60);
  const [exCloseMinute, setExCloseMinute] = React.useState(22 * 60);

  const dirty = days.some((d, i) => {
    const o = initialDays[i];
    return !o || d.isOpen !== o.isOpen || d.openMinute !== o.openMinute || d.closeMinute !== o.closeMinute;
  });

  const setDay = (dayOfWeek: number, patch: Partial<DaySchedule>) => {
    setDays((xs) => xs.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const resetExceptionForm = () => {
    setExDate(null); setExIsOpen(false); setExOpenMinute(8 * 60); setExCloseMinute(22 * 60);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title={`Horarios · ${courtName}`}
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>
          HORARIO SEMANAL
        </Text>
        {days.map((d) => (
          <View key={d.dayOfWeek} style={{
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
            borderRadius: 12, padding: 12, gap: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{DAY_LABELS[d.dayOfWeek]}</Text>
              <Switch
                testID={`day-open-${d.dayOfWeek}`}
                value={d.isOpen}
                onChange={(v) => setDay(d.dayOfWeek, { isOpen: v })}
              />
            </View>
            {d.isOpen && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TimeField
                  testID={`day-time-${d.dayOfWeek}-open`}
                  label="Abre" value={d.openMinute}
                  onPress={() => setTimeField({ dayOfWeek: d.dayOfWeek, field: 'openMinute' })}
                />
                <TimeField
                  testID={`day-time-${d.dayOfWeek}-close`}
                  label="Cierra" value={d.closeMinute}
                  onPress={() => setTimeField({ dayOfWeek: d.dayOfWeek, field: 'closeMinute' })}
                />
              </View>
            )}
          </View>
        ))}

        <Button
          fullWidth variant={dirty && !savingWeek ? 'primary' : 'disabled'} loading={savingWeek}
          onPress={dirty ? () => onSaveWeek(days) : undefined}
        >
          Guardar horario semanal
        </Button>

        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>
            EXCEPCIONES
          </Text>
          <Pressable onPress={() => { resetExceptionForm(); setExceptionOpen(true); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Plus size={14} color={colors.accentText} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentText }}>Agregar</Text>
          </Pressable>
        </View>

        {exceptions.length === 0 ? (
          <Text style={{ fontSize: 12, color: colors.muted2, lineHeight: 18 }}>
            Sin excepciones — la cancha sigue el horario semanal todos los días.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {exceptions.map((ex) => (
              <View key={ex.date} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{formatExceptionDate(ex.date)}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1 }}>
                    {ex.isOpen && ex.openMinute != null && ex.closeMinute != null
                      ? `${minuteToLabel(ex.openMinute)} – ${minuteToLabel(ex.closeMinute)}`
                      : 'Cerrado todo el día'}
                  </Text>
                </View>
                <Pressable onPress={() => onDeleteException(ex.date)} hitSlop={8}
                  accessibilityRole="button" accessibilityLabel="Quitar excepción"
                  testID={`exception-delete-${ex.date}`}
                  style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg2 }}>
                  <Trash2 size={14} color={colors.destructive}/>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Hoja para agregar una excepción — fecha (chips) + cerrado/horario especial. */}
      {exceptionOpen && (
        <View testID="exception-sheet" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderTopWidth: 1, borderColor: colors.line,
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: sheetPaddingBottom, gap: 12,
        }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.text }}>Nueva excepción</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {upcomingDates.map((d) => {
              const on = exDate === d.iso;
              return (
                <Pressable key={d.iso} onPress={() => setExDate(d.iso)}
                  style={{ backgroundColor: on ? colors.ink : colors.bg2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999 }}>
                  <Text style={{ color: on ? '#FFFFFF' : colors.text2, fontSize: 12, fontWeight: '700' }}>{d.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text }}>Abierto ese día</Text>
            <Switch value={exIsOpen} onChange={setExIsOpen} testID="exception-open-switch" />
          </View>
          {exIsOpen && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TimeField testID="exception-time-open" label="Abre" value={exOpenMinute} onPress={() => setTimeField({ exception: true, field: 'openMinute' })} />
              <TimeField testID="exception-time-close" label="Cierra" value={exCloseMinute} onPress={() => setTimeField({ exception: true, field: 'closeMinute' })} />
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="soft" fullWidth onPress={() => setExceptionOpen(false)}>Cancelar</Button>
            <Button
              fullWidth loading={savingException}
              variant={exDate ? 'primary' : 'disabled'}
              onPress={exDate ? () => {
                onAddException({
                  date: exDate, isOpen: exIsOpen,
                  openMinute: exIsOpen ? exOpenMinute : undefined,
                  closeMinute: exIsOpen ? exCloseMinute : undefined,
                });
                setExceptionOpen(false);
              } : undefined}
            >
              Guardar excepción
            </Button>
          </View>
        </View>
      )}

      <TimePickerSheet
        visible={!!timeField}
        title={timeField && 'field' in timeField && timeField.field === 'openMinute' ? 'Hora de apertura' : 'Hora de cierre'}
        value={
          !timeField ? 0
          : 'exception' in timeField ? (timeField.field === 'openMinute' ? exOpenMinute : exCloseMinute)
          : (timeField.field === 'openMinute'
            ? days.find((d) => d.dayOfWeek === timeField.dayOfWeek)?.openMinute ?? 0
            : days.find((d) => d.dayOfWeek === timeField.dayOfWeek)?.closeMinute ?? 0)
        }
        onSelect={(m) => {
          if (!timeField) return;
          if ('exception' in timeField) {
            if (timeField.field === 'openMinute') setExOpenMinute(m); else setExCloseMinute(m);
          } else {
            setDay(timeField.dayOfWeek, { [timeField.field]: m });
          }
        }}
        onClose={() => setTimeField(null)}
      />
    </SafeAreaView>
  );
}

function TimeField({ label, value, onPress, testID }: { label: string; value: number; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={{
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1.5, borderColor: colors.line, borderRadius: 10,
      backgroundColor: colors.bg2, paddingHorizontal: 12, paddingVertical: 10,
    }}>
      <Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700' }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'right' }}>{minuteToLabel(value)}</Text>
      <ChevronDown size={14} color={colors.muted2} />
    </Pressable>
  );
}
