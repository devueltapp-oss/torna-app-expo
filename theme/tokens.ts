/**
 * Torna — Design tokens.
 * Single source of truth for color / type / spacing / radii / shadow.
 * Mirror of colors_and_type.css and src/config/theme.ts.
 */
import { Platform, TextStyle } from 'react-native';

// ── BRAND (constant across themes) ─────────────────────────────────────
const brand = {
  // Strict 3-color palette per the Torna corporate brand manual (rebrand
  // 2026-09-08: lime #D6FF7E → #BFFE3D, navy ink #2d4c75 → #001449).
  // Lime is THE CTA color; navy is the structural surface in dark mode and
  // the primary text color in light mode. Gradients are banned.
  primary:    '#BFFE3D',   // lime CTA bg
  primary600: '#AAE236',   // pressed lime (~11% darker than #BFFE3D)
  primary500: '#BFFE3D',
  primary100: 'rgba(191,254,61,0.22)',
  primaryFg:  '#001449',   // text/icon color when placed ON the lime CTA
  // accentText = legible accent text on the current surface. Defaults to
  // navy (for white surfaces); darkColors below overrides to lime.
  accentText: '#001449',

  accent:     '#BFFE3D',
  accentSoft: 'rgba(191,254,61,0.18)',

  /**
   * Verde de marca **legible sobre una superficie clara**.
   *
   * ⚠️ El lima (`#BFFE3D`) sobre blanco da **1.20:1** de contraste — medido, no
   * estimado (era 1.14:1 con el lima anterior `#D6FF7E`; el nuevo lima es
   * apenas más contrastado pero sigue siendo prácticamente invisible). Es lo
   * que hacía que el ítem activo del navbar no se distinguiera del inactivo en
   * modo claro. Este verde da **5.08:1** (WCAG AA) y sigue siendo de la misma
   * familia — no depende del tono exacto de lima, así que el rebrand no lo toca.
   *
   * `darkColors` lo pisa con el lima, que sobre el nuevo navy de marca da
   * 12.61:1 (sobre `surface` `#0E2646`) / 13.57:1 (sobre `bg` `#08203E`): ahí
   * el problema no existe y usar el verde oscuro sería el error inverso.
   *
   * ✅ Para **texto e íconos** sobre `surface`/`bg`.
   * ❌ NO para fondos de CTA: ahí sigue mandando `accent` con texto `ink`, que es
   *    el par de la marca (y el que usa el badge EN VIVO).
   */
  accentStrong: '#4F7A1C',

  ink:   '#001449',
  // `ink2` colapsado a `ink` en el rebrand 2026-09-08: el mockup oficial no
  // define un segundo tono de navy, y arrastrar el `#25406b` viejo desentonaba
  // al lado del `ink` nuevo. Sigue existiendo como alias (no se tocaron los
  // 3 call sites: fondo placeholder de video en Player/ProcessingStep y fill
  // decorativo de ContentThumb) por si algún día vuelve a necesitar un tono
  // propio — hoy es simplemente `ink`.
  ink2:  '#001449',
  navy:  '#001449',

  // Status colors collapsed into the brand palette (lime + navy contrast).
  live:    '#BFFE3D',
  warning: '#BFFE3D',
  warnFg:  '#001449',
  success: '#BFFE3D',
  okFg:    '#001449',
  info:    '#BFFE3D',
  infoFg:  '#001449',
  danger:  '#001449',

  /**
   * ⚠️ ÚNICA excepción al "solo 3 colores" del manual: el rojo de **acciones
   * destructivas** (borrar un chat, y lo que venga después).
   *
   * El manual colapsa todos los status al lima porque son decorativos. Borrar no
   * lo es: si el botón que destruye algo se ve igual que el resto, la gente lo
   * toca sin registrar qué hace. El rojo acá no es estética, es la señal.
   *
   * **Solo para el affordance destructivo** (fondo del swipe, botón de confirmar
   * borrado). No lo uses para errores de formulario, badges ni texto común: para
   * eso está `danger`, que sigue siendo el navy de marca.
   */
  destructive:   '#D94A3D',
  destructiveFg: '#FFFFFF',
};

// ── LIGHT ──────────────────────────────────────────────────────────────
export const lightColors = {
  ...brand,
  bg:       '#FFFFFF',
  surface:  '#FFFFFF',
  surface2: '#F3F5F9',
  bg2:      '#F3F5F9',
  // Mismo salto relativo que tenía bg2→bg3 antes del rebrand (-10,-7,-4 sobre
  // 255 en cada canal, aplicado ahora sobre el nuevo `surface2`/`bg2`).
  bg3:      '#E9EEF5',
  // rgba de `ink` (`#001449`) — antes eran rgba de `#2d4c75`, mismas opacidades.
  line:        'rgba(0,20,73,0.14)',
  lineStrong:  'rgba(0,20,73,0.26)',
  text:   '#001449',
  text2:  'rgba(0,20,73,0.85)',
  muted2: 'rgba(0,20,73,0.70)',
  muted:  'rgba(0,20,73,0.50)',
  // rgba del nuevo lima (`#BFFE3D`) — mismas opacidades que ya usaban.
  liveBg: 'rgba(191,254,61,0.22)',
  warnBg: 'rgba(191,254,61,0.22)',
  okBg:   'rgba(191,254,61,0.18)',
  infoBg: 'rgba(191,254,61,0.18)',
};

// ── DARK (navy-based per Torna web palette) ────────────────────────────
export const darkColors = {
  ...brand,
  // Fondo base, el más oscuro del mockup oficial.
  bg:       '#08203E',
  // accent text flips to lime on the navy surface
  accentText: '#BFFE3D',
  // Sobre el navy de marca el lima da 12.61:1 (surface) / 13.57:1 (bg): acá el
  // verde oscuro sería ilegible.
  accentStrong: '#BFFE3D',
  // Superficie elevada (cards, tab bar, sheets) — antes bg==surface; el
  // mockup los separa en dos tonos de navy distintos.
  surface:  '#0E2646',
  // Progresión de navy intermedios, cada uno un poco más claro que el
  // anterior (bg → surface → surface2 → bg3), aproximado del mockup y
  // verificado a ojo por contraste — no son valores oficiales del manual.
  surface2: '#15304F',
  bg2:      '#15304F',
  bg3:      '#1C3A5C',
  line:        'rgba(255,255,255,0.18)',
  lineStrong:  'rgba(255,255,255,0.32)',
  text:   '#FFFFFF',
  text2:  'rgba(255,255,255,0.90)',
  muted2: 'rgba(255,255,255,0.78)',
  muted:  'rgba(255,255,255,0.55)',
  // rgba del nuevo lima (`#BFFE3D`) — mismas opacidades que ya usaban.
  liveBg: 'rgba(191,254,61,0.22)',
  warnBg: 'rgba(191,254,61,0.22)',
  okBg:   'rgba(191,254,61,0.18)',
  infoBg: 'rgba(191,254,61,0.18)',
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
