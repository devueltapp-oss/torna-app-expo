/**
 * Bug real: el padding inferior era un número fijo (`safeBottom = 18`). Con
 * Android edge-to-edge (obligatorio desde API 35 / Android 15, que la app ya
 * targetea con Expo SDK 55), el contenido dibuja por debajo de la barra de
 * navegación del sistema en vez de que el OS le reserve el espacio — la tab
 * bar quedaba tapada por los botones/gestos nativos y "Perfil" (el último tab)
 * era imposible de tocar.
 *
 * El fix lee el inset real (`useSafeAreaInsets().bottom`):
 *   - Android: EXACTO al inset (piso de 8 solo si el inset es 0, navegación
 *     por 3 botones) — nunca debe quedar tapada por el sistema.
 *   - iOS: inset + 8, para que quede visualmente elevada sobre el home
 *     indicator (sin el riesgo de que un botón nativo la tape).
 */
import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../../theme';
import { BottomTabBar } from '../BottomTabBar';

function renderBar(bottomInset: number, props: Partial<React.ComponentProps<typeof BottomTabBar>> = {}) {
  const { getByTestId } = render(
    <SafeAreaProvider initialMetrics={{
      frame: { x: 0, y: 0, width: 360, height: 800 },
      insets: { top: 0, left: 0, right: 0, bottom: bottomInset },
    }}>
      <ThemeProvider initial="light">
        <BottomTabBar active="home" onChange={jest.fn()} role="player" {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return getByTestId('bottom-tab-bar');
}

describe('BottomTabBar — padding inferior', () => {
  const originalOS = Platform.OS;
  afterEach(() => { Platform.OS = originalOS; });

  it('Android con gestos (inset 24) → padding EXACTO al inset, nunca tapada', () => {
    Platform.OS = 'android';
    const bar = renderBar(24);
    expect(bar.props.style.paddingBottom).toBe(24);
  });

  it('Android con 3 botones (inset 0) → piso de 8, no queda en 0', () => {
    Platform.OS = 'android';
    const bar = renderBar(0);
    expect(bar.props.style.paddingBottom).toBe(8);
  });

  it('iOS con home indicator (inset 34) → inset + 8 (elevada a propósito)', () => {
    Platform.OS = 'ios';
    const bar = renderBar(34);
    expect(bar.props.style.paddingBottom).toBe(42);
  });

  it('un safeBottom explícito pisa el cálculo automático', () => {
    Platform.OS = 'android';
    const bar = renderBar(24, { safeBottom: 12 });
    expect(bar.props.style.paddingBottom).toBe(12);
  });
});
