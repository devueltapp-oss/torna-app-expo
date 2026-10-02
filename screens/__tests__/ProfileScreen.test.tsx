/**
 * Eliminar cuenta también aplica al rol Club (pestaña Seguridad): un club es
 * un `User` igual que un player, así que reusa `deleteMyAccount` + `logout()`.
 * La diferencia real está del lado del backend (409 si tiene canchas o
 * partidas pendientes) — acá solo se comprueba que ese mensaje se muestre y
 * que, si falla, no se cierre la sesión.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ProfileScreen, ClubProfile } from '../ProfileScreen';

const mockDeleteMyAccount = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../api/profile', () => ({
  deleteMyAccount: (...args: unknown[]) => mockDeleteMyAccount(...args),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    changePassword: jest.fn(),
    logout: mockLogout,
  }),
}));

const profile: ClubProfile = {
  name: 'Club Casapadel', username: '@casapadel', address: '', phone: '', description: '',
};

function renderScreen() {
  return render(
    <ThemeProvider initial="light">
      <ProfileScreen profile={profile} role="club" />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockDeleteMyAccount.mockReset().mockResolvedValue(undefined);
  mockLogout.mockReset().mockResolvedValue(undefined);
});

describe('ProfileScreen (club) — eliminar cuenta', () => {
  it('la fila está en la pestaña Seguridad, no en Perfil', () => {
    const { getByText, queryByTestId } = renderScreen();
    // Arranca en "Perfil": la fila no debería estar visible todavía.
    expect(queryByTestId('settings-delete-account')).toBeNull();

    fireEvent.press(getByText('Seguridad'));
    expect(getByText('Eliminar mi cuenta')).toBeTruthy();
  });

  it('confirmar borra la cuenta del club y reusa logout()', async () => {
    const { getByText, getByTestId } = renderScreen();
    fireEvent.press(getByText('Seguridad'));
    fireEvent.press(getByTestId('settings-delete-account'));
    fireEvent.press(getByTestId('confirm-sheet-confirm'));

    await waitFor(() => expect(mockDeleteMyAccount).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('un club con canchas/partidas pendientes (409) ve el motivo y no cierra sesión', async () => {
    mockDeleteMyAccount.mockRejectedValue(
      new Error('No se puede eliminar la cuenta: el club todavía tiene canchas o partidas pendientes. Contactá a soporte.'),
    );
    const { getByText, getByTestId, findByText } = renderScreen();
    fireEvent.press(getByText('Seguridad'));
    fireEvent.press(getByTestId('settings-delete-account'));
    fireEvent.press(getByTestId('confirm-sheet-confirm'));

    expect(await findByText(/todavía tiene canchas o partidas pendientes/)).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

/**
 * `onBack` (2026-10-02): `ProfileScreen` pasó de ser la raíz del tab Perfil
 * del club a ser su sub-vista "Ajustes", abierta desde el nuevo perfil
 * propio. Sin `onBack` el header queda exactamente igual que antes.
 */
describe('ProfileScreen — flecha de volver (onBack)', () => {
  it('sin onBack, no muestra ninguna flecha', () => {
    const { queryByLabelText } = render(
      <ThemeProvider initial="light"><ProfileScreen profile={profile} role="club" /></ThemeProvider>,
    );
    expect(queryByLabelText(/volver/i)).toBeNull();
  });

  it('con onBack, la flecha aparece y lo llama al tocarla', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <ThemeProvider initial="light"><ProfileScreen profile={profile} role="club" onBack={onBack} /></ThemeProvider>,
    );
    fireEvent.press(getByTestId('profile-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
