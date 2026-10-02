import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClubCreateGameContainer } from '../ClubCreateGameContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useCourtBlocksForDay } from '../../hooks/useCourtBlocksForDay';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../hooks/useCourtBlocksForDay', () => ({ useCourtBlocksForDay: jest.fn() }));

const court = { id: 'court-1', name: 'Cancha 1', cams: 2, indoor: false, nextSlot: '', cameras: [{ id: 'cam-1', identifier: 'CAM01' }] };
const slot = { start: '10:00', end: '11:30', duration: 90, price: 0, status: 'free', cams: 2 };

jest.mock('../../screens', () => {
  const actual = jest.requireActual('../../screens');
  return {
    ...actual,
    ReserveBlocksScreen: ({ onContinue }: any) => {
      const { Pressable, Text } = require('react-native');
      return (
        <Pressable testID="fake-continue" onPress={() => onContinue({ court, slot, day: { iso: '2026-09-02', label: 'Hoy', date: '2', dow: 'MAR' }, blocks: 1 })}>
          <Text>continuar</Text>
        </Pressable>
      );
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  (useCourtBlocksForDay as jest.Mock).mockReturnValue({
    clubName: 'Club Jeyu', clubLoc: { lat: null, lng: null },
    courts: [court], courtSlots: [{ court, slots: [slot] }], loading: false, loadSlots: jest.fn(),
  });
});

test.each([null, { id: 'player', isClub: false }])('no monta el flujo de agendar para non-club %j', (user) => {
  (useAuth as jest.Mock).mockReturnValue({ user });
  const view = render(<ClubCreateGameContainer navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
  expect(view.queryByTestId('fake-continue')).toBeNull();
  expect(useCourtBlocksForDay).not.toHaveBeenCalled();
});

test('club: al continuar, navega a ClubAssignPlayers con los params del bloque elegido', () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { id: 'club-1', isClub: true } });
  const navigate = jest.fn();
  const view = render(<ClubCreateGameContainer navigation={{ navigate, goBack: jest.fn() }} />);

  fireEvent.press(view.getByTestId('fake-continue'));

  expect(navigate).toHaveBeenCalledWith('ClubAssignPlayers', {
    courtId: 'court-1',
    courtLabel: 'Cancha 1',
    cameraOptions: [{ id: 'cam-1', identifier: 'CAM01' }],
    date: '2026-09-02',
    slotStart: '10:00',
    slotEnd: '11:30',
    durationMinutes: 90,
  });
});
