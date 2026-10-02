/**
 * Editar cancha (club): SOLO lo que existe en el backend — cámaras asignadas
 * (multi-select) + activar/desactivar la cancha entera. "Guardar cambios"
 * arranca deshabilitado hasta tocar algo (no tiene sentido guardar sin
 * cambios), y el payload de `onSave` refleja exactamente la selección.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClubEditCourtScreen } from '../ClubEditCourtScreen';
import { ThemeProvider } from '../../theme';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const cameraOptions = [{ id: 'cam-1', identifier: 'CAM01' }, { id: 'cam-2', identifier: 'CAM02' }];

describe('ClubEditCourtScreen', () => {
  it('"Guardar cambios" arranca deshabilitado sin tocar nada', () => {
    const onSave = jest.fn();
    const { getByText } = renderWithTheme(
      <ClubEditCourtScreen courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={['cam-1']} onSave={onSave} />,
    );
    fireEvent.press(getByText('Guardar cambios'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('togglear "Cancha activa" habilita guardar con el payload correcto', () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <ClubEditCourtScreen courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={['cam-1']} onSave={onSave} />,
    );
    // El Switch no tiene testID propio acá — se toca por accessibilityRole.
    fireEvent.press(getByTestId('court-active-switch'));
    fireEvent.press(getByText('Guardar cambios'));
    expect(onSave).toHaveBeenCalledWith({ cameraIds: ['cam-1'], isActive: false });
  });

  it('elegir otra cámara habilita guardar con la nueva selección', () => {
    const onSave = jest.fn();
    const { getByText } = renderWithTheme(
      <ClubEditCourtScreen courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={['cam-1']} onSave={onSave} />,
    );
    fireEvent.press(getByText('CAM02'));
    fireEvent.press(getByText('Guardar cambios'));
    expect(onSave).toHaveBeenCalledWith({ cameraIds: ['cam-1', 'cam-2'], isActive: true });
  });

  it('con partida en vivo, muestra el banner y "Ver →" navega a ella', () => {
    const onWatchLive = jest.fn();
    const { getByText } = renderWithTheme(
      <ClubEditCourtScreen
        courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={[]}
        liveGameId="game-1" onWatchLive={onWatchLive} onSave={jest.fn()}
      />,
    );
    fireEvent.press(getByText(/Hay una partida EN VIVO/));
    expect(onWatchLive).toHaveBeenCalledTimes(1);
  });

  it('sin partida en vivo, no muestra el banner', () => {
    const { queryByText } = renderWithTheme(
      <ClubEditCourtScreen courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={[]} onSave={jest.fn()} />,
    );
    expect(queryByText(/EN VIVO/)).toBeNull();
  });

  it('"Horarios" llama a onOpenSchedule; sin el prop, no se muestra la fila', () => {
    const onOpenSchedule = jest.fn();
    const { getByTestId, queryByTestId, rerender } = renderWithTheme(
      <ClubEditCourtScreen courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={[]} onSave={jest.fn()} onOpenSchedule={onOpenSchedule} />,
    );
    fireEvent.press(getByTestId('open-court-schedule'));
    expect(onOpenSchedule).toHaveBeenCalledTimes(1);

    rerender(
      <ThemeProvider>
        <ClubEditCourtScreen courtName="Cancha 1" isActive cameraOptions={cameraOptions} selectedCameraIds={[]} onSave={jest.fn()} />
      </ThemeProvider>,
    );
    expect(queryByTestId('open-court-schedule')).toBeNull();
  });
});
