/**
 * Lo que hay que fijar acá es el **guard de foco**, que es de donde salió el bug:
 * `MainPlayer` no se desmonta cuando se apila un chat encima, así que sin el
 * guard su listener de atrás seguía vivo y se comía el back de la pantalla de
 * arriba (primer toque: nada visible; segundo: salías del chat a Inicio en vez
 * de volver a Chats).
 */
import { BackHandler, Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useBackToHomeTab } from '../useBackToHomeTab';

let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));

/** Dispara el atrás del sistema sobre el último listener registrado (LIFO real). */
function pressBack(): boolean {
  const handlers = (BackHandler.addEventListener as jest.Mock).mock.calls;
  const last = handlers[handlers.length - 1];
  return last ? last[1]() : false;
}

describe('useBackToHomeTab', () => {
  const remove = jest.fn();

  beforeEach(() => {
    mockFocused = true;
    Platform.OS = 'android';
    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove } as any);
    remove.mockClear();
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('en un tab que no es Inicio, el atrás lleva a Inicio y se consume', () => {
    const goHome = jest.fn();
    renderHook(() => useBackToHomeTab(true, goHome));

    expect(pressBack()).toBe(true);
    expect(goHome).toHaveBeenCalledTimes(1);
  });

  it('en Inicio no registra nada (ahí manda el doble toque para salir)', () => {
    renderHook(() => useBackToHomeTab(false, jest.fn()));
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });

  /**
   * El caso del bug: con un chat apilado encima, esta pantalla sigue montada
   * pero pierde el foco. No puede seguir escuchando el atrás.
   */
  it('sin foco NO registra: el atrás es de la pantalla apilada encima', () => {
    mockFocused = false;
    renderHook(() => useBackToHomeTab(true, jest.fn()));
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });

  it('al perder el foco quita el listener que ya tenía', () => {
    const { rerender } = renderHook(() => useBackToHomeTab(true, jest.fn()));
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);

    mockFocused = false;
    rerender({});

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('en iOS no hace nada (BackHandler no existe ahí)', () => {
    Platform.OS = 'ios';
    renderHook(() => useBackToHomeTab(true, jest.fn()));
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });
});
