/**
 * "Enlazar GoPro" (club) — selector de configuraciones de WiFi guardadas
 * (2026-10-02), reemplaza los campos libres de SSID/password: se elige una
 * `CameraConfig` existente (relación WiFi → cámara → cancha) o se crea una
 * nueva inline.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClubCamerasScreen } from '../ClubCamerasScreen';
import { ThemeProvider } from '../../theme';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const camera = { id: 'cam-1', identifier: 'CAM01', bleName: '6997' };
const config = { id: 'cfg-1', name: 'WiFi del club', wifiSsid: 'Jeyu', wifiPassword: 'secret' };

function baseProps(overrides: Partial<Parameters<typeof ClubCamerasScreen>[0]> = {}) {
  return {
    cameras: [camera], selected: camera, loading: false, busy: false,
    ssid: '', stopped: false, status: '', error: '', linked: new Set<string>(), pending: false,
    configs: [config], configsLoading: false, selectedConfigId: undefined,
    selectConfig: jest.fn(), createConfig: jest.fn(async () => config),
    setStopped: jest.fn(), load: jest.fn(), start: jest.fn(), select: jest.fn(), cancel: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  };
}

describe('ClubCamerasScreen — selector de configuraciones de WiFi', () => {
  it('muestra las configuraciones guardadas y elegir una llama a selectConfig', () => {
    const selectConfig = jest.fn();
    const { getByText } = renderWithTheme(<ClubCamerasScreen {...baseProps({ selectConfig })} />);
    fireEvent.press(getByText('WiFi del club'));
    expect(selectConfig).toHaveBeenCalledWith('cfg-1');
  });

  it('sin configuraciones guardadas, muestra el aviso', () => {
    const { getByText } = renderWithTheme(<ClubCamerasScreen {...baseProps({ configs: [] })} />);
    expect(getByText(/Todavía no hay configuraciones de WiFi guardadas/)).toBeTruthy();
  });

  it('"+ Nueva configuración de WiFi" abre el form; guardar llama a createConfig con el payload correcto', async () => {
    const createConfig = jest.fn(async () => config);
    const { getByText, getByLabelText } = renderWithTheme(<ClubCamerasScreen {...baseProps({ createConfig })} />);

    fireEvent.press(getByText('+ Nueva configuración de WiFi'));
    fireEvent.changeText(getByLabelText('Nombre de la configuración'), 'WiFi del club');
    fireEvent.changeText(getByLabelText('Nombre de la red WiFi'), 'Jeyu');
    fireEvent.changeText(getByLabelText('Contraseña de la red WiFi'), 'secret');
    fireEvent.press(getByText('Guardar configuración'));

    await waitFor(() => expect(createConfig).toHaveBeenCalledWith({ name: 'WiFi del club', wifiSsid: 'Jeyu', wifiPassword: 'secret' }));
  });

  it('"Guardar configuración" arranca deshabilitado sin nombre ni red', () => {
    const createConfig = jest.fn();
    const { getByText } = renderWithTheme(<ClubCamerasScreen {...baseProps({ createConfig })} />);
    fireEvent.press(getByText('+ Nueva configuración de WiFi'));
    fireEvent.press(getByText('Guardar configuración'));
    expect(createConfig).not.toHaveBeenCalled();
  });

  it('"Enlazar cámara" deshabilitado sin SSID elegido o sin confirmar "detenida"', () => {
    const start = jest.fn();
    const { getByText } = renderWithTheme(<ClubCamerasScreen {...baseProps({ start, ssid: '', stopped: true })} />);
    fireEvent.press(getByText('Enlazar cámara'));
    expect(start).not.toHaveBeenCalled();
  });

  it('"Enlazar cámara" habilitado con cámara + SSID elegido + detenida confirmada', () => {
    const start = jest.fn();
    const { getByText } = renderWithTheme(<ClubCamerasScreen {...baseProps({ start, ssid: 'Jeyu', stopped: true, selectedConfigId: 'cfg-1' })} />);
    fireEvent.press(getByText('Enlazar cámara'));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
