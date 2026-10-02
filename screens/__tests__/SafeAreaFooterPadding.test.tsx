/**
 * Bug real (2026-10-03): el footer "Continuar →"/"Crear partida"/"Guardar…"
 * de varias pantallas del flujo de reserva/agendar tenía `paddingBottom: 18`
 * FIJO. Con Android edge-to-edge (obligatorio desde API 35) el contenido
 * dibuja por debajo de la barra/gestos del sistema en vez de que el OS le
 * reserve el espacio — el botón quedaba en el mismo lugar que los botones
 * nativos de retroceso. Mismo bug y mismo fix ya validado en `BottomTabBar`
 * (ver su test): leer `useSafeAreaInsets().bottom` real del dispositivo.
 */
import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../theme';
import { ReserveBlocksScreen } from '../ReserveBlocksScreen';
import { ReserveStep3Screen } from '../ReserveStep3Screen';
import { ClubAssignPlayersScreen } from '../ClubAssignPlayersScreen';
import { ClubEditCourtScreen } from '../ClubEditCourtScreen';
import { ClubCourtScheduleScreen } from '../ClubCourtScheduleScreen';
import { defaultWeekSchedule } from '../../lib/schedule';

function withInset(bottomInset: number, ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 360, height: 800 },
      insets: { top: 0, left: 0, right: 0, bottom: bottomInset },
    }}>
      <ThemeProvider initial="light">{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; });

describe('ReserveBlocksScreen — footer', () => {
  it('Android con gestos (inset 24) → padding EXACTO al inset', () => {
    Platform.OS = 'android';
    const { getByTestId } = withInset(24, <ReserveBlocksScreen clubName="C" courtSlots={[]} onBack={jest.fn()} onContinue={jest.fn()} />);
    expect(getByTestId('reserve-blocks-footer').props.style.paddingBottom).toBe(24);
  });
  it('Android con 3 botones (inset 0) → piso de 18, no queda en 0', () => {
    Platform.OS = 'android';
    const { getByTestId } = withInset(0, <ReserveBlocksScreen clubName="C" courtSlots={[]} onBack={jest.fn()} onContinue={jest.fn()} />);
    expect(getByTestId('reserve-blocks-footer').props.style.paddingBottom).toBe(18);
  });
  it('iOS con home indicator (inset 34) → inset + 18', () => {
    Platform.OS = 'ios';
    const { getByTestId } = withInset(34, <ReserveBlocksScreen clubName="C" courtSlots={[]} onBack={jest.fn()} onContinue={jest.fn()} />);
    expect(getByTestId('reserve-blocks-footer').props.style.paddingBottom).toBe(52);
  });
});

describe('ReserveStep3Screen — footer', () => {
  it('Android con gestos (inset 24) → padding EXACTO al inset', () => {
    Platform.OS = 'android';
    const { getByTestId } = withInset(24, <ReserveStep3Screen summary={{ title: 'T', date: 'D', time: 'H', priceLabel: '$0' }} />);
    expect(getByTestId('reserve-step3-footer').props.style.paddingBottom).toBe(24);
  });
});

describe('ClubAssignPlayersScreen — footer', () => {
  it('Android con gestos (inset 24) → padding EXACTO al inset', () => {
    Platform.OS = 'android';
    const { getByTestId } = withInset(24, <ClubAssignPlayersScreen summary={{ title: 'T', date: 'D', time: 'H' }} cameraOptions={[]} />);
    expect(getByTestId('assign-players-footer').props.style.paddingBottom).toBe(24);
  });
});

describe('ClubEditCourtScreen — footer', () => {
  it('Android con gestos (inset 24) → padding EXACTO al inset', () => {
    Platform.OS = 'android';
    const { getByTestId } = withInset(24, <ClubEditCourtScreen courtName="C" isActive cameraOptions={[]} selectedCameraIds={[]} onSave={jest.fn()} />);
    expect(getByTestId('edit-court-footer').props.style.paddingBottom).toBe(24);
  });
});

describe('ClubCourtScheduleScreen — hoja de excepción', () => {
  it('Android con gestos (inset 24) → padding EXACTO al inset', () => {
    Platform.OS = 'android';
    const { getByText, getByTestId } = withInset(24, (
      <ClubCourtScheduleScreen
        courtName="C" days={defaultWeekSchedule()} exceptions={[]} upcomingDates={[{ iso: '2026-09-02', label: 'Hoy' }]}
        onSaveWeek={jest.fn()} onAddException={jest.fn()} onDeleteException={jest.fn()}
      />
    ));
    fireEvent.press(getByText('Agregar'));
    expect(getByTestId('exception-sheet').props.style.paddingBottom).toBe(24);
  });
});
