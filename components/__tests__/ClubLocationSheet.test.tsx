/**
 * ClubLocationSheet — cobertura de UI básica: se abre, muestra el estado del
 * hook, permite guardar y cerrar. El deslizar-para-cerrar se cubre aparte en
 * `useSwipeToDismiss.test.ts` (el `PanResponder` no es simulable con
 * fireEvent).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ClubLocationSheet } from '../ClubLocationSheet';

const mockUseClubLocation = jest.fn();
jest.mock('../../hooks/useClubLocation', () => ({
  useClubLocation: (...args: unknown[]) => mockUseClubLocation(...args),
}));

function baseHook(overrides: Partial<ReturnType<typeof mockUseClubLocation>> = {}) {
  return {
    location: null,
    searchEnabled: false,
    results: [],
    picked: null,
    locating: false,
    searching: false,
    saving: false,
    problem: null,
    query: '',
    setQuery: jest.fn(),
    useMyPosition: jest.fn(),
    choose: jest.fn(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function renderSheet(hookOverrides: Partial<ReturnType<typeof mockUseClubLocation>> = {}) {
  mockUseClubLocation.mockReturnValue(baseHook(hookOverrides));
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <ClubLocationSheet visible onClose={onClose} onSaved={onSaved} />
    </ThemeProvider>,
  );
  return { ...utils, onClose, onSaved };
}

describe('ClubLocationSheet', () => {
  it('muestra el copy y el botón de usar la ubicación actual', () => {
    const { getByText } = renderSheet();
    expect(getByText('¿Dónde está tu club?')).toBeTruthy();
    expect(getByText('Usar mi ubicación actual')).toBeTruthy();
  });

  it('sin backend de búsqueda configurado, no muestra el buscador de dirección', () => {
    const { queryByPlaceholderText } = renderSheet({ searchEnabled: false });
    expect(queryByPlaceholderText('Buscar la dirección del club')).toBeNull();
  });

  it('con búsqueda habilitada, escribir llama a setQuery', () => {
    const setQuery = jest.fn();
    const { getByPlaceholderText } = renderSheet({ searchEnabled: true, setQuery });
    fireEvent.changeText(getByPlaceholderText('Buscar la dirección del club'), 'Av. Libertador');
    expect(setQuery).toHaveBeenCalledWith('Av. Libertador');
  });

  it('sin nada elegido, el botón pasa variant="disabled" (Button bloquea el toque)', () => {
    // La guarda real vive en `Button` (`components/ui.tsx`): con
    // `variant="disabled"` su `Pressable` interno recibe `onPress={undefined}`,
    // así que un toque real no hace nada. `fireEvent.press` de RNTL no sirve
    // para probar esto: sube por el árbol de React y encuentra el `onPress`
    // que esta pantalla le pasó al `<Button>` como prop, sin pasar por esa
    // guarda interna — algo que no pasa en la app real.
    const { UNSAFE_getAllByType } = renderSheet({ picked: null });
    const { Button } = require('../ui');
    const button = UNSAFE_getAllByType(Button).find(
      (b: any) => b.props.children === 'Guardar ubicación',
    );
    expect(button?.props.variant).toBe('disabled');
  });

  it('con una ubicación elegida, guardar llama a save() y cierra si tuvo éxito', async () => {
    const save = jest.fn().mockResolvedValue(true);
    const { getByText, onClose, onSaved } = renderSheet({
      picked: { latitude: -34.6, longitude: -58.4, address: 'CABA' },
      save,
    });

    fireEvent.press(getByText('Guardar ubicación'));

    await Promise.resolve();
    expect(save).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('"Ahora no" cierra sin guardar', () => {
    const save = jest.fn();
    const { getByText, onClose } = renderSheet({ save });
    fireEvent.press(getByText('Ahora no'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('tocar el fondo cierra la hoja', () => {
    const { getByText, onClose } = renderSheet();
    // El backdrop es el Pressable raíz del Modal; tocar el título (dentro de
    // la hoja) NO debe cerrar — confirma que el tap se absorbe.
    fireEvent.press(getByText('¿Dónde está tu club?'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
