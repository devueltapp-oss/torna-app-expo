import {ClubCourt} from './components/CourtList';

export type ClubStats = {
  members: number;
  courts: number;
  tournaments: number;
  coaches: number;
};

export type ClubUpcomingMatchParticipant = {
  id: string;
  username: string;
  name: string;
  profilePicture: string;
};

export type ClubUpcomingMatch = {
  id: string;
  imageUrl: string;
  users: ClubUpcomingMatchParticipant[];
  clubName: string;
  floor: string;
  previewMode: 'video' | 'versus';
  isLive: boolean;
  startAt: string;
  badgeLabel?: string;
  badgeColor?: string;
  badgeSubLabel?: string;
};

export type ClubData = {
  name: string;
  location: string;
  description: string;
  banner: string;
  avatar: string;
  stats: ClubStats;
  courts: ClubCourt[];
  upcomingMatches: ClubUpcomingMatch[];
};

export const CLUB_FAKE_DATA: Record<string, ClubData> = {
  'club-san-isidro': {
    name: 'Club San Isidro',
    location: 'San Isidro, Buenos Aires',
    description:
      'Club boutique con canchas indoor climatizadas, entrenadores certificados y comunidad activa.',
    banner:
      'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=80',
    avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
    stats: {
      members: 234,
      courts: 6,
      tournaments: 12,
      coaches: 5,
    },
    courts: [
      {
        id: 'san-isidro-court-1',
        name: 'Cancha Central Indoor',
        surface: 'Césped sintético · Techada',
        pricePerHour: '$45/h',
        availability: 'Disponible hoy 18:00 - 23:00',
        imageUrl:
          'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
      },
      {
        id: 'san-isidro-court-2',
        name: 'Cancha Lateral',
        surface: 'Cemento · Exterior',
        pricePerHour: '$35/h',
        availability: 'Disponible mañana 7:00 - 22:00',
        imageUrl:
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=60',
      },
    ] as ClubCourt[],
    upcomingMatches: [
      {
        id: 'club-san-isidro-1',
        imageUrl:
          'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1170&q=80',
        users: [
          {
            id: 'user-3',
            username: 'Ana',
            name: 'Ana',
            profilePicture: 'https://randomuser.me/api/portraits/women/45.jpg',
          },
          {
            id: 'user-7',
            username: 'Carla',
            name: 'Carla',
            profilePicture: 'https://randomuser.me/api/portraits/women/16.jpg',
          },
        ],
        clubName: 'Club San Isidro',
        floor: 'Cancha 2',
        previewMode: 'versus',
        isLive: false,
        startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'club-san-isidro-2',
        imageUrl:
          'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=60',
        users: [
          {
            id: 'user-8',
            username: 'Romi',
            name: 'Romi',
            profilePicture: 'https://randomuser.me/api/portraits/women/15.jpg',
          },
          {
            id: 'user-6',
            username: 'Valentina',
            name: 'Valentina',
            profilePicture: 'https://randomuser.me/api/portraits/women/32.jpg',
          },
        ],
        clubName: 'Club San Isidro',
        floor: 'Cancha Central',
        previewMode: 'versus',
        isLive: false,
        startAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  'club-palermo': {
    name: 'Club Palermo',
    location: 'Palermo, Buenos Aires',
    description:
      'Complejo con canchas panorámicas y bar terraza. Ideal para jugar después de la oficina.',
    banner:
      'https://images.unsplash.com/photo-1560072810-1cffb09faf0f?auto=format&fit=crop&w=1600&q=80',
    avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
    stats: {
      members: 410,
      courts: 8,
      tournaments: 18,
      coaches: 7,
    },
    courts: [
      {
        id: 'palermo-court-1',
        name: 'Cancha Panorámica',
        surface: 'Blindex 360º · Techada',
        pricePerHour: '$55/h',
        availability: 'Disponible hoy 19:00 - 23:30',
        imageUrl:
          'https://images.unsplash.com/photo-1560072810-1cffb09faf0f?auto=format&fit=crop&w=1200&q=60',
      },
      {
        id: 'palermo-court-2',
        name: 'Cancha Rooftop',
        surface: 'Exterior · Iluminada',
        pricePerHour: '$60/h',
        availability: 'Disponible viernes 18:00 - 01:00',
        imageUrl:
          'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
      },
    ] as ClubCourt[],
    upcomingMatches: [
      {
        id: 'club-palermo-1',
        imageUrl:
          'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1170&q=80',
        users: [
          {
            id: 'user-1',
            username: 'Mariano',
            name: 'Mariano',
            profilePicture: 'https://randomuser.me/api/portraits/men/85.jpg',
          },
          {
            id: 'user-2',
            username: 'Martin',
            name: 'Martin',
            profilePicture: 'https://randomuser.me/api/portraits/men/12.jpg',
          },
        ],
        clubName: 'Club Palermo',
        floor: 'Cancha Techada',
        previewMode: 'versus',
        isLive: false,
        startAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  'club-belgrano': {
    name: 'Club Belgrano',
    location: 'Belgrano, Buenos Aires',
    description:
      'Referente en torneos federados, con canchas outdoor y gimnasio de alto rendimiento.',
    banner:
      'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
    avatar: 'https://randomuser.me/api/portraits/lego/0.jpg',
    stats: {
      members: 320,
      courts: 5,
      tournaments: 22,
      coaches: 6,
    },
    courts: [
      {
        id: 'belgrano-court-1',
        name: 'Central Belgrano',
        surface: 'Césped sintético · Semi indoor',
        pricePerHour: '$50/h',
        availability: 'Disponible fin de semana 8:00 - 22:00',
        imageUrl:
          'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=60',
      },
    ] as ClubCourt[],
    upcomingMatches: [],
  },
};

export const DEFAULT_CLUB: ClubData = {
  name: 'Club Torna',
  location: 'Buenos Aires',
  description:
    'Club en construcción. Pronto podrás ver información sobre las próximas actividades.',
  banner:
    'https://images.unsplash.com/photo-1489286696299-aa476fc9c7b0?auto=format&fit=crop&w=1600&q=80',
  avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
  stats: {
    members: 0,
    courts: 0,
    tournaments: 0,
    coaches: 0,
  },
  courts: [] as ClubCourt[],
  upcomingMatches: [],
};

export type TimeSlot = {
  label: string;
  hours: number;
  minutes: number;
};

export const buildTimeSlots = (): TimeSlot[] =>
  Array.from({length: Math.floor(((24 * 60) - 90 - 360) / 90) + 1}).map(
    (_, index) => {
      const minutes = 360 + index * 90; // inicia 06:00
      const hours = Math.floor(minutes / 60);
      const remain = minutes % 60;
      const label = new Date(0, 0, 0, hours, remain).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {label, hours, minutes: remain};
    },
  );




