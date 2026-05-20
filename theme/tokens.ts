/**
 * Torna — Design tokens.
 * Single source of truth for color / type / spacing / radii / shadow.
 * Mirror of colors_and_type.css and src/config/theme.ts.
 */
import { Platform, TextStyle } from 'react-native';

// ── BRAND (constant across themes) ─────────────────────────────────────
const brand = {
  // Strict 3-color palette per the Torna corporate brand manual.
  // Lime is THE CTA color; blue is the structural surface in dark mode and
  // the primary text color in light mode. Gradients are banned.
  primary:    '#D6FF7E',   // lime CTA bg
  primary600: '#c1ea63',   // pressed lime
  primary500: '#D6FF7E',
  primary100: 'rgba(214,255,126,0.22)',
  primaryFg:  '#2d4c75',   // text/icon color when placed ON the lime CTA
  // accentText = legible accent text on the current surface. Defaults to
  // blue (for white surfaces); darkColors below overrides to lime.
  accentText: '#2d4c75',

  accent:     '#D6FF7E',
  accentSoft: 'rgba(214,255,126,0.18)',

  ink:   '#2d4c75',
  ink2:  '#25406b',
  navy:  '#2d4c75',

  // Status colors collapsed into the brand palette (lime + blue contrast).
  live:    '#D6FF7E',
  warning: '#D6FF7E',
  warnFg:  '#2d4c75',
  success: '#D6FF7E',
  okFg:    '#2d4c75',
  info:    '#D6FF7E',
  infoFg:  '#2d4c75',
  danger:  '#2d4c75',
};

// ── LIGHT ──────────────────────────────────────────────────────────────
export const lightColors = {
  ...brand,
  bg:       '#FFFFFF',
  surface:  '#FFFFFF',
  surface2: '#F4F7FB',
  bg2:      '#F4F7FB',
  bg3:      '#EAF0F7',
  line:        'rgba(45,76,117,0.14)',
  lineStrong:  'rgba(45,76,117,0.26)',
  text:   '#2d4c75',
  text2:  'rgba(45,76,117,0.85)',
  muted2: 'rgba(45,76,117,0.70)',
  muted:  'rgba(45,76,117,0.50)',
  liveBg: 'rgba(214,255,126,0.22)',
  warnBg: 'rgba(214,255,126,0.22)',
  okBg:   'rgba(214,255,126,0.18)',
  infoBg: 'rgba(214,255,126,0.18)',
};

// ── DARK (navy-based per Torna web palette) ────────────────────────────
export const darkColors = {
  ...brand,
  bg:       '#2d4c75',
  // accent text flips to lime on the blue surface
  accentText: '#D6FF7E',
  surface:  '#2d4c75',
  surface2: '#25406b',
  bg2:      '#25406b',
  bg3:      '#1f3a5c',
  line:        'rgba(255,255,255,0.18)',
  lineStrong:  'rgba(255,255,255,0.32)',
  text:   '#FFFFFF',
  text2:  'rgba(255,255,255,0.90)',
  muted2: 'rgba(255,255,255,0.78)',
  muted:  'rgba(255,255,255,0.55)',
  liveBg: 'rgba(214,255,126,0.22)',
  warnBg: 'rgba(214,255,126,0.22)',
  okBg:   'rgba(214,255,126,0.18)',
  infoBg: 'rgba(214,255,126,0.18)',
};

export type ThemeColors = typeof lightColors;

// ── SPACING (4-px scale) ───────────────────────────────────────────────
export const spacing = {
  px: 1, 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40,
  12: 48, 16: 64, 20: 80,
} as const;

export const radii = {
  none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, pill: 9999,
} as const;

// ── TYPE ───────────────────────────────────────────────────────────────
/**
 * React Native does NOT auto-pick variants by `fontWeight` — each weight of a
 * custom font must be registered as its own `fontFamily`. We load four Manrope
 * weights in `App.tsx` (see `useFonts`) under these names:
 *
 *   Manrope            → 400 Regular
 *   Manrope-Medium     → 500 Medium
 *   Manrope-Bold       → 700 Bold
 *   Manrope-ExtraBold  → 800 ExtraBold
 *
 * Use `manropeFont(weight)` to get the right family name from a numeric weight.
 * Never combine custom-font `fontFamily` with `fontWeight` on RN — pick one
 * source of truth per Text node (the helper handles it).
 */
export const fonts = {
  // Brand: Helvetica for everything. Coolvetica is the H1 family per the
  // brand manual but isn't shipped yet — falls back to Helvetica Bold for now.
  regular:    Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'Helvetica' })!,
  medium:     Platform.select({ ios: 'Helvetica', android: 'sans-serif-medium', default: 'Helvetica' })!,
  bold:       Platform.select({ ios: 'Helvetica-Bold', android: 'sans-serif', default: 'Helvetica' })!,
  extraBold:  Platform.select({ ios: 'Helvetica-Bold', android: 'sans-serif', default: 'Helvetica' })!,
  // TODO: ship Coolvetica.ttf and swap display → 'Coolvetica'.
  display:    Platform.select({ ios: 'Helvetica-Bold', android: 'sans-serif', default: 'Helvetica' })!,
  body:       Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'Helvetica' })!,
  mono:       Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })!,
};

export type ManropeWeight = '400' | '500' | '700' | '800';

/**
 * Map a weight (number, string or RN `fontWeight`) to the proper Manrope family
 * name. Falls back to `Manrope` (400). Use this anywhere you need bold/medium:
 *
 *   <Text style={{ fontFamily: manropeFont('700'), fontSize: 18 }}>Hola</Text>
 */
export function manropeFont(weight?: TextStyle['fontWeight'] | number): string {
  const w = String(weight ?? '400');
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return fonts.bold;
  return fonts.regular;
}

export const typography: Record<string, TextStyle> = {
  display: { fontFamily: fonts.extraBold, fontSize: 36, lineHeight: 44, letterSpacing: -0.7 },
  h1:      { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  h2:      { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3:      { fontFamily: fonts.bold,      fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  title:   { fontFamily: fonts.bold,      fontSize: 16, lineHeight: 22 },
  body:    { fontFamily: fonts.regular,   fontSize: 14, lineHeight: 20 },
  bodySm:  { fontFamily: fonts.regular,   fontSize: 12, lineHeight: 18 },
  caption: { fontFamily: fonts.medium,    fontSize: 11, lineHeight: 16 },
  overline:{ fontFamily: fonts.extraBold, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  mono:    { fontFamily: fonts.mono,      fontWeight: '500', fontSize: 11, lineHeight: 16 },
};

// ── SHADOWS (RN-native + Android elevation) ────────────────────────────
export const shadows = {
  soft1: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  soft2: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  card: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 5,
  },
} as const;
