import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {Avatar, Button, ButtonText, Text} from '@gluestack-ui/themed';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CustomHeader from '@/components/header/CustomHeader';
import {colors} from '@/config/theme';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import {ClubCourt} from '@/screens/club-screen/components/CourtList';
import {
  CLUB_FAKE_DATA,
  ClubData,
  DEFAULT_CLUB,
  TimeSlot,
  buildTimeSlots,
} from '@/screens/club-screen/club-data';

type Props = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.reserveCourt'
>;

const durationOptions = [90, 120, 150, 180];
const wizardSteps = [
  {key: 'schedule', label: 'Fecha y hora'},
  {key: 'payment', label: 'Pago'},
  {key: 'success', label: 'Confirmación'},
] as const;

const ReserveCourtScreen = ({route, navigation}: Props) => {
  const insets = useSafeAreaInsets();
  const {clubId, court} = route.params;

  const club = useMemo<ClubData>(
    () => CLUB_FAKE_DATA[clubId as keyof typeof CLUB_FAKE_DATA] ?? DEFAULT_CLUB,
    [clubId],
  );

  const timeSlots = useMemo<TimeSlot[]>(() => buildTimeSlots(), []);

  const [reserveStep, setReserveStep] =
    useState<'schedule' | 'payment' | 'success'>('schedule');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(90);
  const [selectedPayment, setSelectedPayment] =
    useState<'vip' | 'onsite' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(1);
    return base;
  });

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const maxDate = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 30);
    return date;
  }, [today]);

  useEffect(() => {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    setSelectedDate(baseDate);
    setCalendarMonth(() => {
      const start = new Date(baseDate);
      start.setDate(1);
      return start;
    });
    const defaultSlot = timeSlots[0] ?? null;
    setSelectedTimeSlot(defaultSlot);
    setSelectedDuration(90);
    setSelectedPayment(null);
  }, [timeSlots]);

  const calendarMonthLabel = useMemo(
    () =>
      calendarMonth.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      }),
    [calendarMonth],
  );

  const earliestMonthStart = useMemo(() => {
    const date = new Date(today);
    date.setDate(1);
    return date;
  }, [today]);

  const lastMonthStart = useMemo(() => {
    const date = new Date(maxDate);
    date.setDate(1);
    return date;
  }, [maxDate]);

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(calendarMonth);
    startOfMonth.setHours(0, 0, 0, 0);
    const startWeekDay = (startOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(startOfMonth);
    gridStart.setDate(gridStart.getDate() - startWeekDay);
    gridStart.setHours(0, 0, 0, 0);

    return Array.from({length: 42}).map((_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      date.setHours(0, 0, 0, 0);
      const isCurrentMonth =
        date.getMonth() === calendarMonth.getMonth() &&
        date.getFullYear() === calendarMonth.getFullYear();
      const disabled = date < today || date > maxDate;
      return {
        date,
        label: date.getDate().toString(),
        isCurrentMonth,
        disabled,
        isToday: date.getTime() === today.getTime(),
      };
    });
  }, [calendarMonth, maxDate, today]);

  const canGoPrevMonth =
    calendarMonth.getTime() > earliestMonthStart.getTime();
  const canGoNextMonth =
    calendarMonth.getTime() < lastMonthStart.getTime();

  const handlePrevMonth = useCallback(() => {
    if (!canGoPrevMonth) {
      return;
    }
    setCalendarMonth(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      return next;
    });
  }, [canGoPrevMonth]);

  const handleNextMonth = useCallback(() => {
    if (!canGoNextMonth) {
      return;
    }
    setCalendarMonth(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      return next;
    });
  }, [canGoNextMonth]);

  const handleSelectCalendarDay = useCallback(
    (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      setSelectedDate(normalized);
      const start = new Date(normalized);
      start.setDate(1);
      setCalendarMonth(start);

      const slot = selectedTimeSlot ?? timeSlots[0];
      if (slot) {
        setSelectedTimeSlot(slot);
      }

      setSelectedPayment(null);
    },
    [selectedTimeSlot, timeSlots],
  );

  const handleSelectTimeSlot = useCallback((slot: TimeSlot) => {
    if (!selectedDate) {
      return;
    }
    setSelectedTimeSlot(slot);
    setSelectedPayment(null);
  }, [selectedDate]);

  const selectedDateTime = useMemo(() => {
    if (!selectedDate || !selectedTimeSlot) {
      return null;
    }
    const date = new Date(selectedDate);
    date.setHours(selectedTimeSlot.hours, selectedTimeSlot.minutes, 0, 0);
    return date;
  }, [selectedDate, selectedTimeSlot]);

  const currentStepIndex = wizardSteps.findIndex(
    step => step.key === reserveStep,
  );
  const wizardProgress =
    ((currentStepIndex + 1) / wizardSteps.length) * 100;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      <CustomHeader
        textBack="Volver"
        textCenter={club.name}
        showNotificationIcon={false}
        showProfileIcon={false}
        customGoBack={handleClose}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.wizardHeader}>
          <Text style={styles.wizardTitle} bold>
            {reserveStep === 'success'
              ? 'Reserva completada'
              : `Reservar ${court.name}`}
          </Text>
          <Text style={styles.wizardStepCounter}>
            Paso {currentStepIndex + 1} de {wizardSteps.length}
          </Text>
          <Text style={styles.wizardStepLabel}>
            {wizardSteps[currentStepIndex]?.label ?? ''}
          </Text>
          <View style={styles.wizardProgressTrack}>
            <View
              style={[
                styles.wizardProgressFill,
                {width: `${wizardProgress}%`},
              ]}
            />
          </View>
        </View>

        <View style={styles.courtSummaryCard}>
          <Avatar size="lg" style={styles.courtAvatar}>
            <Avatar.Image source={{uri: club.avatar}} />
          </Avatar>
          <View style={styles.courtSummaryText}>
            <Text bold>{court.name}</Text>
            <Text color={colors.neutral500}>{court.surface}</Text>
            <Text color={colors.neutral500}>{court.pricePerHour}</Text>
          </View>
        </View>

        {reserveStep === 'schedule' && (
          <>
            <View style={styles.wizardSectionCard}>
              <Text style={styles.stepDescription} color={colors.neutral500}>
                Seleccioná el día que prefieras. Podés reservar hasta 30 días por
                adelantado.
              </Text>
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    onPress={handlePrevMonth}
                    disabled={!canGoPrevMonth}
                    style={[
                      styles.calendarHeaderButton,
                      !canGoPrevMonth && styles.calendarHeaderButtonDisabled,
                    ]}>
                    <Text
                      style={styles.calendarHeaderButtonText}
                      color={
                        canGoPrevMonth ? colors.neutral600 : colors.neutral400
                      }
                      bold>
                      ‹
                    </Text>
                  </Pressable>
                  <Text style={styles.calendarHeaderTitle} bold>
                    {calendarMonthLabel}
                  </Text>
                  <Pressable
                    onPress={handleNextMonth}
                    disabled={!canGoNextMonth}
                    style={[
                      styles.calendarHeaderButton,
                      !canGoNextMonth && styles.calendarHeaderButtonDisabled,
                    ]}>
                    <Text
                      style={styles.calendarHeaderButtonText}
                      color={
                        canGoNextMonth ? colors.neutral600 : colors.neutral400
                      }
                      bold>
                      ›
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.calendarWeekRow}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(weekday => (
                    <Text key={weekday} style={styles.calendarWeekDay} bold>
                      {weekday}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarDays.map(day => {
                    const isSelected =
                      !!selectedDate &&
                      selectedDate.getTime() === day.date.getTime();
                    return (
                      <Pressable
                        key={day.date.toISOString()}
                        disabled={day.disabled}
                        onPress={() => handleSelectCalendarDay(day.date)}
                        style={[
                          styles.calendarDay,
                          !day.isCurrentMonth && styles.calendarDayInactive,
                          day.disabled && styles.calendarDayDisabled,
                          isSelected && styles.calendarDaySelected,
                          day.isToday && styles.calendarDayToday,
                        ]}>
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                          ]}
                          bold={isSelected}>
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.wizardSectionCard}>
              <Text style={styles.stepDescription} color={colors.neutral500}>
                Elegí un turno disponible.
              </Text>
              <Text style={styles.wizardSelectedDate} color={colors.neutral600}>
                {selectedDate
                  ? selectedDate.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Fecha no seleccionada'}
              </Text>
              <View style={styles.slotGrid}>
                {timeSlots.map(slot => {
                  const isSelected = selectedTimeSlot?.label === slot.label;
                  const disabled = !selectedDate;
                  const textColor = disabled
                    ? colors.neutral400
                    : isSelected
                    ? colors.primary
                    : colors.neutral600;
                  return (
                    <Pressable
                      key={slot.label}
                      disabled={disabled}
                      onPress={() => handleSelectTimeSlot(slot)}
                      style={[
                        styles.slotChip,
                        disabled && styles.slotChipDisabled,
                        isSelected && styles.slotChipSelected,
                      ]}>
                      <Text color={textColor} bold={isSelected}>
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.timePickerSelected} color={colors.neutral600}>
                {selectedTimeSlot
                  ? `Inicio estimado: ${selectedTimeSlot.label}`
                  : 'Seleccioná un horario disponible'}
              </Text>
              <Text style={styles.timePickerHelp} color={colors.neutral500}>
                Turnos disponibles entre 06:00 y 23:30.
              </Text>
              <Text color={colors.neutral500}>Duración</Text>
              <View style={styles.slotGrid}>
                {durationOptions.map(duration => {
                  const isSelected = duration === selectedDuration;
                  return (
                    <Pressable
                      key={duration}
                      onPress={() => setSelectedDuration(duration)}
                      style={[
                        styles.slotChip,
                        isSelected && styles.slotChipSelected,
                      ]}>
                      <Text
                        color={
                          isSelected ? colors.primary : colors.neutral600
                        }
                        bold={isSelected}>
                        {duration} min
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.wizardActions}>
              <Button
                style={[styles.reserveButton, styles.wizardButton]}
                action="positive"
                isDisabled={!selectedDate || !selectedTimeSlot}
                onPress={() => setReserveStep('payment')}>
                <ButtonText bold>Continuar</ButtonText>
              </Button>
            </View>
          </>
        )}

        {reserveStep === 'payment' && (
          <>
            <View style={styles.wizardSectionCard}>
              <Text style={styles.stepDescription} color={colors.neutral500}>
                Revisá los detalles y elegí cómo querés pagar.
              </Text>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryHeading} bold>
                  Resumen
                </Text>
                <Text style={styles.summaryText}>{court.name}</Text>
                <Text style={styles.summaryText}>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })
                    : 'Fecha no seleccionada'}
                  {selectedTimeSlot ? ` · ${selectedTimeSlot.label}` : ''}
                </Text>
                <Text style={styles.summaryText}>
                  Duración: {selectedDuration} min
                </Text>
              </View>
              <View style={styles.slotGrid}>
                {[
                  {key: 'vip', label: 'Puntos VIP'},
                  {key: 'onsite', label: 'Pagar en el sitio'},
                ].map(option => {
                  const isSelected = option.key === selectedPayment;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() =>
                        setSelectedPayment(option.key as 'vip' | 'onsite')
                      }
                      style={[
                        styles.slotChip,
                        isSelected && styles.slotChipSelected,
                      ]}>
                      <Text
                        color={
                          isSelected ? colors.primary : colors.neutral600
                        }
                        bold={isSelected}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.wizardActions}>
              <Button
                variant="outline"
                style={[styles.reserveButton, styles.wizardButton]}
                onPress={() => setReserveStep('schedule')}>
                <ButtonText bold>Volver</ButtonText>
              </Button>
              <Button
                style={[styles.reserveButton, styles.wizardButton]}
                action="positive"
                isDisabled={!selectedPayment}
                onPress={() => setReserveStep('success')}>
                <ButtonText bold>Confirmar reserva</ButtonText>
              </Button>
            </View>
          </>
        )}

        {reserveStep === 'success' && (
          <View style={styles.successSection}>
            <View style={styles.successEmojiWrapper}>
              <Text fontSize={48}>🎉</Text>
            </View>
            <Text fontSize={18} bold color={colors.neutral900}>
              ¡Cancha reservada!
            </Text>
            <Text color={colors.neutral500} textAlign="center">
              {selectedDateTime
                ? `Te esperamos el ${selectedDateTime.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })} a las ${selectedDateTime.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Reserva confirmada'}
              {' '}por {selectedDuration} minutos. Recibirás la confirmación en tu
              correo.
            </Text>
            <Button
              style={[styles.reserveButton, styles.successButton]}
              action="positive"
              onPress={handleClose}>
              <ButtonText bold>Cerrar</ButtonText>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 32,
    gap: 24,
  },
  wizardHeader: {
    gap: 4,
  },
  wizardTitle: {
    fontSize: 20,
    color: colors.neutral900,
  },
  wizardStepCounter: {
    color: colors.neutral600,
  },
  wizardStepLabel: {
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  wizardProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral200,
    overflow: 'hidden',
    marginTop: 4,
  },
  wizardProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  courtSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.neutral50,
    borderWidth: 1,
    borderColor: colors.neutral100,
  },
  courtAvatar: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  courtSummaryText: {
    flex: 1,
    gap: 4,
  },
  wizardSectionCard: {
    backgroundColor: colors.neutral50,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.neutral100,
  },
  stepDescription: {
    fontSize: 14,
  },
  calendarContainer: {
    marginTop: 8,
    gap: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarHeaderTitle: {
    fontSize: 16,
    textTransform: 'capitalize',
    color: colors.neutral900,
  },
  calendarHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral100,
  },
  calendarHeaderButtonDisabled: {
    backgroundColor: colors.neutral100,
    opacity: 0.4,
  },
  calendarHeaderButtonText: {
    fontSize: 18,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarWeekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    color: colors.neutral500,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  calendarDayInactive: {
    opacity: 0.4,
  },
  calendarDayDisabled: {
    opacity: 0.2,
  },
  calendarDaySelected: {
    backgroundColor: colors.primary,
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  calendarDayText: {
    color: colors.neutral600,
  },
  calendarDayTextSelected: {
    color: colors.white,
  },
  wizardSelectedDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  timePickerSelected: {
    marginTop: 8,
  },
  timePickerHelp: {
    marginTop: 4,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral200,
    backgroundColor: colors.white,
  },
  slotChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(45,76,117,0.1)',
  },
  slotChipDisabled: {
    opacity: 0.4,
  },
  wizardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  wizardButton: {
    flex: 1,
    borderRadius: 12,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  summaryHeading: {
    fontSize: 16,
    color: colors.neutral900,
  },
  summaryText: {
    color: colors.neutral600,
  },
  reserveButton: {
    borderRadius: 12,
  },
  successSection: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  successEmojiWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButton: {
    alignSelf: 'stretch',
  },
});

export default ReserveCourtScreen;

