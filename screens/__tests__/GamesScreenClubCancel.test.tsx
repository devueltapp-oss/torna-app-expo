/**
 * `GamesScreen` (role="club", 2026-10-02): botón "Agendar" + cancelar una
 * reserva ajena deslizando la fila (mismo patrón que borrar un chat en
 * `ChatsInboxScreen`). Solo las filas `SCHEDULED` son deslizables — cancelar
 * una ya `LIVE`/`FINISHED` no tiene sentido de producto.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GamesScreen } from '../GamesScreen';
import { ThemeProvider } from '../../theme';
import type { GameListData } from '../../components/cards';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const scheduled: GameListData = { id: 'g-sched', court: 'Cancha 1', cam: 'CAM01', players: 4, time: '10:00', date: '2 sept', status: 'SCHEDULED' };
const live: GameListData = { id: 'g-live', court: 'Cancha 2', cam: 'CAM02', players: 4, time: '11:00', date: '2 sept', status: 'LIVE' };
const cancelled: GameListData = { id: 'g-cancel', court: 'Cancha 3', cam: 'CAM03', players: 0, time: '12:00', date: '2 sept', status: 'CANCELLED' };
const stopped: GameListData = { id: 'g-stopped', court: 'Cancha 4', cam: 'CAM04', players: 4, time: '13:00', date: '2 sept', status: 'STOPPED' };

describe('GamesScreen (club) — agendar + cancelar', () => {
  it('"Agendar" llama a onCreateGame', () => {
    const onCreateGame = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <GamesScreen games={[scheduled]} role="club" onCreateGame={onCreateGame} />,
    );
    fireEvent.press(getByLabelText('Agendar partida'));
    expect(onCreateGame).toHaveBeenCalledTimes(1);
  });

  it('sin onCreateGame, no muestra el botón "Agendar"', () => {
    const { queryByLabelText } = renderWithTheme(<GamesScreen games={[scheduled]} role="club" />);
    expect(queryByLabelText('Agendar partida')).toBeNull();
  });

  it('solo la fila SCHEDULED es cancelable; LIVE no tiene papelera', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <GamesScreen games={[scheduled, live]} role="club" onCancelGame={jest.fn()} />,
    );
    expect(getByTestId('game-cancel-g-sched')).toBeTruthy();
    expect(queryByTestId('game-cancel-g-live')).toBeNull();
  });

  it('sin onCancelGame, ninguna fila tiene papelera (swipe que no hace nada es peor que no tenerlo)', () => {
    const { queryByTestId } = renderWithTheme(<GamesScreen games={[scheduled]} role="club" />);
    expect(queryByTestId('game-cancel-g-sched')).toBeNull();
  });

  it('cancelar pide confirmación y, al confirmar, llama a onCancelGame con el id correcto', async () => {
    const onCancelGame = jest.fn(async () => {});
    const { getByTestId, getByText } = renderWithTheme(
      <GamesScreen games={[scheduled]} role="club" onCancelGame={onCancelGame} />,
    );
    fireEvent.press(getByTestId('game-cancel-g-sched'));
    expect(onCancelGame).not.toHaveBeenCalled(); // todavía falta confirmar

    fireEvent.press(getByText('Cancelar reserva'));
    await waitFor(() => expect(onCancelGame).toHaveBeenCalledWith('g-sched'));
  });

  it('cancelar la confirmación sin confirmar no llama a onCancelGame', () => {
    const onCancelGame = jest.fn();
    const { getByTestId, getByText, queryByText } = renderWithTheme(
      <GamesScreen games={[scheduled]} role="club" onCancelGame={onCancelGame} />,
    );
    fireEvent.press(getByTestId('game-cancel-g-sched'));
    // El título de la hoja de confirmación.
    expect(getByText('Cancelar esta reserva')).toBeTruthy();
    fireEvent.press(getByText('Cancelar')); // acción "cancelar" (cancelLabel default) del ConfirmSheet
    expect(onCancelGame).not.toHaveBeenCalled();
    expect(queryByText('Cancelar esta reserva')).toBeNull();
  });
});

/**
 * Una partida CANCELLED es un soft-delete (2026-10-02): sigue en la base,
 * pero mostrarla junto al resto es trash visual. Queda afuera de "Todas" y
 * del resto de los filtros, accesible solo desde un filtro propio
 * ("Canceladas") para quien la busque a propósito.
 */
describe('GamesScreen (club) — partidas CANCELLED ocultas por default', () => {
  it('"Todas" no muestra las canceladas', () => {
    const { queryByText, getByText } = renderWithTheme(
      <GamesScreen games={[scheduled, cancelled]} role="club" />,
    );
    expect(getByText(/Cancha 1/)).toBeTruthy();
    expect(queryByText(/Cancha 3/)).toBeNull();
  });

  it('"Finalizadas" tampoco las muestra (son su propio filtro, no un sinónimo)', () => {
    const { queryByText, getByText } = renderWithTheme(
      <GamesScreen games={[cancelled]} role="club" />,
    );
    fireEvent.press(getByText('Finalizadas'));
    expect(queryByText(/Cancha 3/)).toBeNull();
  });

  it('el filtro "Canceladas" las muestra, y a nada más', () => {
    const { getByText, queryByText } = renderWithTheme(
      <GamesScreen games={[scheduled, cancelled]} role="club" />,
    );
    fireEvent.press(getByText('Canceladas'));
    expect(getByText(/Cancha 3/)).toBeTruthy();
    expect(queryByText(/Cancha 1/)).toBeNull();
  });
});

/**
 * Finalizar una partida EN VIVO (2026-10-02) — única transición manual real
 * sobre un vivo (no hay "detener sin finalizar" ni "reanudar": no existen en
 * el backend). Mismo patrón swipe+papelera que cancelar, pero solo en filas
 * `LIVE`, con su propio texto en el `ConfirmSheet`.
 */
describe('GamesScreen (club) — finalizar partida EN VIVO', () => {
  it('solo la fila LIVE tiene la acción de finalizar; SCHEDULED no', () => {
    const { getByTestId, queryByTestId } = renderWithTheme(
      <GamesScreen games={[scheduled, live]} role="club" onFinishGame={jest.fn()} />,
    );
    expect(getByTestId('game-finish-g-live')).toBeTruthy();
    expect(queryByTestId('game-finish-g-sched')).toBeNull();
  });

  it('sin onFinishGame, la fila LIVE no tiene papelera', () => {
    const { queryByTestId } = renderWithTheme(<GamesScreen games={[live]} role="club" />);
    expect(queryByTestId('game-finish-g-live')).toBeNull();
  });

  it('finalizar pide confirmación y, al confirmar, llama a onFinishGame con el id correcto', async () => {
    const onFinishGame = jest.fn(async () => {});
    const { getByTestId, getByText } = renderWithTheme(
      <GamesScreen games={[live]} role="club" onFinishGame={onFinishGame} />,
    );
    fireEvent.press(getByTestId('game-finish-g-live'));
    expect(getByText('Finalizar esta partida')).toBeTruthy();
    expect(onFinishGame).not.toHaveBeenCalled();

    fireEvent.press(getByText('Finalizar partida'));
    await waitFor(() => expect(onFinishGame).toHaveBeenCalledWith('g-live'));
  });

  it('cancelar y finalizar no se pisan: cada fila ofrece solo su propia acción', () => {
    const { getByTestId } = renderWithTheme(
      <GamesScreen games={[scheduled, live]} role="club" onCancelGame={jest.fn()} onFinishGame={jest.fn()} />,
    );
    expect(getByTestId('game-cancel-g-sched')).toBeTruthy();
    expect(getByTestId('game-finish-g-live')).toBeTruthy();
  });
});

/**
 * Bug real (2026-10-03): una partida DETENIDA (cámara nunca conectada o
 * cortada) no es un estado terminal — el horario sigue siendo válido. El
 * club necesita poder liberar ese horario (cancelar) O reconectar la cámara
 * (preparar), igual que una SCHEDULED — antes ninguna de las dos acciones
 * estaba disponible para STOPPED.
 */
describe('GamesScreen (club) — partida DETENIDA: cancelar o reconectar cámara', () => {
  it('tiene la acción de cancelar (swipe) disponible, igual que SCHEDULED', () => {
    const { getByTestId } = renderWithTheme(
      <GamesScreen games={[stopped]} role="club" onCancelGame={jest.fn()} />,
    );
    expect(getByTestId('game-cancel-g-stopped')).toBeTruthy();
  });

  it('muestra "Reconectar cámara" (no el texto de SCHEDULED) y togglear la fila llama a onPrepareGame', () => {
    const onPrepareGame = jest.fn();
    const onOpenGame = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <GamesScreen games={[stopped]} role="club" onPrepareGame={onPrepareGame} onOpenGame={onOpenGame} />,
    );
    expect(getByText('Reconectar cámara')).toBeTruthy();
    expect(queryByText('Iniciar partida · preparar cámaras')).toBeNull();

    fireEvent.press(getByText('Cancha 4 · CAM04 · 4 jug.'));
    expect(onPrepareGame).toHaveBeenCalledWith('g-stopped');
    expect(onOpenGame).not.toHaveBeenCalled();
  });

  it('sin onPrepareGame, tocar la fila cae a onOpenGame (no deja al club sin ninguna acción)', () => {
    const onOpenGame = jest.fn();
    const { getByText } = renderWithTheme(
      <GamesScreen games={[stopped]} role="club" onOpenGame={onOpenGame} />,
    );
    fireEvent.press(getByText('Cancha 4 · CAM04 · 4 jug.'));
    expect(onOpenGame).toHaveBeenCalledWith('g-stopped');
  });
});
