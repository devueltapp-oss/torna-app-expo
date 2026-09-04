/**
 * Eliminar cuenta (App Store 5.1.1(v)): la fila "Eliminar cuenta" vive en su
 * propia "Zona de peligro", separada de "Cerrar sesión", y el flujo real pasa
 * por un `ConfirmSheet` — no un `Alert.alert` — antes de tocar nada.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { PlayerSettingsScreen } from '../PlayerSettingsScreen';
import type { ProfileOwner } from '../../data/types';

const mockDeleteMyAccount = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../api/profile', () => ({
  uploadProfilePicture: jest.fn(),
  uploadFrontPage: jest.fn(),
  updateMyCategory: jest.fn(),
  updateMyProfile: jest.fn(),
  deleteMyAccount: (...args: unknown[]) => mockDeleteMyAccount(...args),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', profilePicture: undefined, frontPage: undefined },
    updateProfilePicture: jest.fn(),
    updateFrontPage: jest.fn(),
    changePassword: jest.fn(),
    logout: mockLogout,
  }),
}));

jest.mock('../../hooks/useNearbyLocation', () => ({
  useNearbyLocation: () => ({
    settings: { enabled: false, hasLocation: false, radiusKm: 25 },
    loading: false,
    problem: null,
    enable: jest.fn(),
    disable: jest.fn(),
    shouldPrompt: false,
    dismissPrompt: jest.fn(),
  }),
}));

const owner: ProfileOwner = {
  name: 'María', username: '@maria', club: '', location: '',
  followers: 0, following: 0,
};

function renderScreen() {
  return render(
    <ThemeProvider initial="light">
      <PlayerSettingsScreen owner={owner} onBack={jest.fn()} onSignOut={jest.fn()} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockDeleteMyAccount.mockReset().mockResolvedValue(undefined);
  mockLogout.mockReset().mockResolvedValue(undefined);
});

describe('PlayerSettingsScreen — eliminar cuenta', () => {
  it('la fila vive en su propia sección, separada de "Cerrar sesión"', () => {
    const { getByText } = renderScreen();
    expect(getByText('Zona de peligro')).toBeTruthy();
    expect(getByText('Eliminar mi cuenta')).toBeTruthy();
    expect(getByText('Cerrar sesión')).toBeTruthy();
  });

  it('tocar la fila abre la confirmación; todavía no llama a nada', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    expect(queryByTestId('confirm-sheet-confirm')).toBeNull();

    fireEvent.press(getByTestId('settings-delete-account'));

    expect(getByTestId('confirm-sheet-confirm')).toBeTruthy();
    expect(mockDeleteMyAccount).not.toHaveBeenCalled();
  });

  it('cancelar cierra la hoja sin eliminar nada', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    fireEvent.press(getByTestId('settings-delete-account'));
    fireEvent.press(getByTestId('confirm-sheet-cancel'));

    expect(queryByTestId('confirm-sheet-confirm')).toBeNull();
    expect(mockDeleteMyAccount).not.toHaveBeenCalled();
  });

  it('confirmar borra la cuenta y reusa el logout() de "Cerrar sesión"', async () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('settings-delete-account'));
    fireEvent.press(getByTestId('confirm-sheet-confirm'));

    await waitFor(() => expect(mockDeleteMyAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('si el backend rechaza el borrado, la hoja queda abierta con el error y NO cierra sesión', async () => {
    mockDeleteMyAccount.mockRejectedValue(new Error('Todavía tenés partidas pendientes.'));
    const { getByTestId, findByText } = renderScreen();

    fireEvent.press(getByTestId('settings-delete-account'));
    fireEvent.press(getByTestId('confirm-sheet-confirm'));

    expect(await findByText(/Todavía tenés partidas pendientes\./)).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
    // La hoja sigue ahí: se puede reintentar sin volver a tocar la fila.
    expect(getByTestId('confirm-sheet-confirm')).toBeTruthy();
  });
});
