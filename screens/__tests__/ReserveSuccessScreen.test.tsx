/**
 * El cierre del flujo de reserva. El botón decía "Volver al perfil del club" y
 * llevaba al tab donde estabas: después de agendar, el perfil del club no es a
 * donde quiere ir nadie. Ahora dice **Finalizar** y el contenedor lo cablea al
 * Inicio, que es donde aparece la partida recién creada.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ReserveSuccessScreen } from '../ReserveSuccessScreen';

function renderScreen(props: Partial<React.ComponentProps<typeof ReserveSuccessScreen>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <ReserveSuccessScreen
        summary={[
          { label: 'Cancha', value: 'Cancha 2' },
          { label: 'Horario', value: 'mié 03/09 · 19:30' },
          { label: 'Pago', value: 'En el club' },
        ]}
        heroLine="¡Reserva confirmada! Te esperamos en la cancha."
        onFinish={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ReserveSuccessScreen', () => {
  it('el CTA dice "Finalizar" y no menciona al club', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Finalizar')).toBeTruthy();
    expect(queryByText(/perfil del club/i)).toBeNull();
  });

  it('tocarlo cierra el flujo', () => {
    const onFinish = jest.fn();
    const { getByText } = renderScreen({ onFinish });

    fireEvent.press(getByText('Finalizar'));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('muestra el resumen de lo agendado', () => {
    const { getByText } = renderScreen();
    expect(getByText('Cancha 2')).toBeTruthy();
    expect(getByText('mié 03/09 · 19:30')).toBeTruthy();
    expect(getByText('En el club')).toBeTruthy();
  });

  /** Sin id de reserva no hay nada que adjuntar: mejor no ofrecer el botón. */
  it('sin handler de compartir, ese botón no aparece', () => {
    const { queryByText } = renderScreen({ onShare: undefined });
    expect(queryByText('Compartir invitación')).toBeNull();
  });

  it('con handler, compartir avisa', () => {
    const onShare = jest.fn();
    const { getByText } = renderScreen({ onShare });

    fireEvent.press(getByText('Compartir invitación'));

    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
