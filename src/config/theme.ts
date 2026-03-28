export const colors = {
  primary: '#2d4c75',
  primary900: '#1B2E47',
  secondary: '#D6FF7E',
  warning: '#F97316',
  tint: '#fff',
  muted: '#e5eaf1',
  tintMuted: '#a1acbe',
  background: '#fff',
  shadow: '#f1f5f9',
  subtle: '#e8e8e8',
  danger: '#BB3717',
  dark: '#0F172A',
  white: '#FFFFFF',
  separator: '#E2E8F0',
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',
  blueGray100: '#F1F5F9',
};

export const lightTheme = {
  colors: {
    typography: '#000000',
    background: '#ffffff',
  },
  margins: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
  },
} as const;

export const darkTheme = {
  colors: {
    typography: '#ffffff',
    background: '#000000',
  },
  margins: {
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
  },
} as const;
