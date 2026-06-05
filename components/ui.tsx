/**
 * Core UI atoms — themed via useTheme(). All props-driven so they can be
 * dropped into screens as plain components.
 *
 * Brand-strict: only #2d4c75 (blue), #D6FF7E (lime), #FFFFFF (white) and
 * opacity-tinted neutrals are used. Status colors collapse into lime+blue.
 */
import React from 'react';
import {
  View, Text, Pressable, TextInput, ActivityIndicator,
  ViewStyle, StyleProp, Image,
} from 'react-native';
import { useTheme } from '../theme';

/* ─────────────────────────────  Button  ───────────────────────────── */

type ButtonVariant = 'primary' | 'accent' | 'ink' | 'live' | 'ghost' | 'soft' | 'danger' | 'disabled';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button(p: ButtonProps) {
  const { colors, radii } = useTheme();
  // CTAs are lime with blue text per brand manual. Ghost = outline blue
  // (legible on white) / outline white (legible on the dark blue surface).
  const v: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary:  { bg: colors.primary,  fg: colors.primaryFg },
    accent:   { bg: colors.accent,   fg: colors.ink },
    ink:      { bg: colors.ink,      fg: '#FFFFFF' },
    live:     { bg: colors.live,     fg: colors.ink },
    ghost:    { bg: 'transparent',   fg: colors.text, border: colors.lineStrong },
    soft:     { bg: colors.bg2,      fg: colors.text },
    danger:   { bg: colors.danger,   fg: '#FFFFFF' },
    disabled: { bg: colors.bg3,      fg: colors.muted },
  };
  const s = { sm: { py: 8, px: 14, fs: 13, r: 10 }, md: { py: 13, px: 18, fs: 14, r: 12 }, lg: { py: 16, px: 20, fs: 15, r: 14 } }[p.size || 'md'];
  const c = v[p.variant || 'primary'];
  return (
    <Pressable
      onPress={p.variant === 'disabled' || p.loading ? undefined : p.onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          paddingVertical: s.py, paddingHorizontal: s.px, borderRadius: s.r,
          backgroundColor: c.bg, borderWidth: c.border ? 1.5 : 0, borderColor: c.border,
          alignSelf: p.fullWidth ? 'stretch' : 'flex-start',
          opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        }, p.style,
      ]}>
      {p.loading
        ? <ActivityIndicator color={c.fg} size="small"/>
        : (<>
            {p.icon}
            <Text style={{ color: c.fg, fontWeight: '700', fontSize: s.fs }}>{p.children}</Text>
          </>)}
    </Pressable>
  );
}

/* ─────────────────────────────  Input  ───────────────────────────── */

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  secureTextEntry?: boolean;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
}

export function Input(p: InputProps) {
  const { colors, radii } = useTheme();
  const [focused, setFocused] = React.useState(false);
  // Focus ring uses the brand accent (lime) since it's the only saturated
  // brand color; on white it reads as a soft halo, on blue as a glow.
  const borderColor = p.error ? colors.danger : focused ? colors.accent : colors.line;
  return (
    <View style={{ gap: 6 }}>
      {p.label && (
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text2 }}>{p.label}</Text>
      )}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: p.disabled ? colors.bg3 : colors.surface,
        borderWidth: 1.5, borderColor, borderRadius: radii.xl,
        paddingHorizontal: 14, paddingVertical: 12,
      }}>
        {p.icon ? <View style={{ opacity: 0.7 }}>{p.icon}</View> : null}
        <TextInput
          value={p.value} onChangeText={p.onChangeText} placeholder={p.placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={p.secureTextEntry} editable={!p.disabled}
          autoCapitalize={p.autoCapitalize} keyboardType={p.keyboardType}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ flex: 1, color: p.disabled ? colors.muted : colors.text, fontSize: 15, padding: 0 }}
        />
      </View>
      {(p.error || p.hint) ? (
        <Text style={{ fontSize: 11, color: p.error ? colors.danger : colors.muted2 }}>{p.error || p.hint}</Text>
      ) : null}
    </View>
  );
}

/* ──────────────────────────  Status Badge  ──────────────────────────
 * Brand-strict: LIVE is the only solid-lime badge (the dot is blue for
 * contrast). The other statuses use outline-only treatments so they stay
 * legible without introducing palette-foreign hues.
 */

export type GameStatus = 'LIVE' | 'SCHEDULED' | 'STOPPED' | 'FINISHED' | 'PENDING';

export function StatusBadge({ status, sub }: { status: GameStatus; sub?: string }) {
  const { colors } = useTheme();
  type Conf = { bg: string; fg: string; label: string; dot?: boolean; border?: string };
  const map: Record<GameStatus, Conf> = {
    LIVE:      { bg: colors.live,       fg: colors.ink,    label: 'EN VIVO', dot: true },
    SCHEDULED: { bg: 'transparent',     fg: colors.text,   label: 'PROGRAMADA', border: colors.lineStrong },
    STOPPED:   { bg: 'transparent',     fg: colors.muted2, label: 'DETENIDA',   border: colors.line },
    FINISHED:  { bg: colors.bg3,        fg: colors.text2,  label: 'FINALIZADA' },
    PENDING:   { bg: 'transparent',     fg: colors.text,   label: 'PENDIENTE',  border: colors.lineStrong },
  };
  const c = map[status];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.bg,
      borderWidth: c.border ? 1.5 : 0, borderColor: c.border,
      paddingHorizontal: c.border ? 8 : 9, paddingVertical: c.border ? 3 : 4, borderRadius: 6,
    }}>
      {c.dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink }} />}
      <Text style={{ color: c.fg, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
        {c.label}{sub ? ` · ${sub}` : ''}
      </Text>
    </View>
  );
}

/* ───────────────────────────  Surface Chip  ─────────────────────────
 * Brand-strict: every surface type uses lime+blue. Distinction comes from
 * the label, not from color (CLAY/GRASS/HARD/CARPET all render the same).
 */

type Surface = 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
export function SurfaceChip({ surface }: { surface: Surface }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
      <Text style={{ color: colors.ink, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>{surface}</Text>
    </View>
  );
}

/* ───────────────────────────  ClubPill  ───────────────────────────── */

export function ClubPill({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ alignSelf: 'flex-start' }}>
      <View style={{
        backgroundColor: colors.accentSoft, paddingHorizontal: 11, paddingVertical: 4,
        borderRadius: 9999, borderBottomWidth: 2, borderBottomColor: colors.accent,
      }}>
        <Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '600' }}>{children}</Text>
      </View>
    </Pressable>
  );
}

/* ───────────────────────────  Avatar  ─────────────────────────────
 * Brand-strict: solid brand-blue background with white initials. We no
 * longer randomize per name — the palette is restricted to 3 colors.
 */

function initials(name = '?') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function Avatar({ name = '?', size = 40, ringColor }: { name?: string; size?: number; ringColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ink,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: ringColor ? 2 : 0, borderColor: ringColor,
    }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function AvatarStack({ users, size = 28, max = 4 }: { users: { name?: string; username?: string }[]; size?: number; max?: number }) {
  const { colors } = useTheme();
  const shown = users.slice(0, max);
  const extra = users.length - max;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((u, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.32, zIndex: shown.length - i }}>
          <Avatar name={u.name || u.username || '?'} size={size} ringColor="#FFFFFF" />
        </View>
      ))}
      {extra > 0 && (
        <View style={{
          marginLeft: -size * 0.32, width: size, height: size, borderRadius: size / 2,
          backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: '#FFFFFF',
        }}>
          <Text style={{ color: colors.text2, fontSize: size * 0.32, fontWeight: '700' }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────  Empty State  ──────────────────────────── */

export function EmptyState({ title, message, action, imageSource }: {
  title: string; message: string; action?: React.ReactNode; imageSource?: any;
}) {
  const { colors } = useTheme();
  return (
    <View style={{
      alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 20,
      backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed',
      borderColor: colors.lineStrong, borderRadius: 16,
    }}>
      {imageSource && <Image source={imageSource} style={{ width: 72, height: 72, opacity: 0.55 }} />}
      <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>{title}</Text>
      <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>{message}</Text>
      {action}
    </View>
  );
}

/* ─────────────────────────  Section Header  ───────────────────────── */

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.4, textTransform: 'uppercase' }}>{title}</Text>
      {action}
    </View>
  );
}

/* ─────────────────────────  App Header  ───────────────────────────── */

export function AppHeader({ title, left, right }: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12, minHeight: 52,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line,
    }}>
      <View style={{ width: 36, alignItems: 'flex-start' }}>{left}</View>
      <Text style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 17, letterSpacing: -0.2, color: colors.text }}>
        {title}
      </Text>
      <View style={{ width: 36, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/* ─────────────────────────  Switch  ───────────────────────────────
 * iOS-style toggle. Track lime when on, neutral when off. Knob is white.
 * Used by ReserveStep3 ("Buscar rivales") and JoinMatch ("Voy con compañero").
 */

export function Switch({ value, onChange, disabled }: {
  value: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      role="switch"
      accessibilityState={{ checked: value, disabled }}
      onPress={disabled ? undefined : () => onChange?.(!value)}
      style={{
        width: 48, height: 28, borderRadius: 9999,
        backgroundColor: value ? colors.primary : colors.lineStrong,
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
      }}>
      <View style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
        shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3, elevation: 2,
      }}/>
    </Pressable>
  );
}

/* ─────────────────────────  SocialButton  ─────────────────────────
 * Used on login screens. Monochrome provider icon (brand blue / white)
 * so we stay within the 3-color brand palette.
 * comingSoon = shows "Próximamente" pill and disables press.
 */

export type SocialProvider = 'google' | 'apple' | 'facebook';

export interface SocialButtonProps {
  provider: SocialProvider;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onPress: () => void;
}

function ProviderIcon({ provider, color }: { provider: SocialProvider; color: string }) {
  const char = { google: 'G', apple: 'A', facebook: 'f' }[provider];
  return (
    <View style={{
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 1.5, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: provider === 'facebook' ? 14 : 12, fontWeight: '800', color, lineHeight: 18 }}>
        {char}
      </Text>
    </View>
  );
}

export function SocialButton({ provider, label, loading = false, disabled = false, comingSoon = false, onPress }: SocialButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || comingSoon;
  const iconColor = inactive ? colors.muted : colors.text;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: inactive ? colors.line : colors.lineStrong,
        backgroundColor: colors.surface,
        opacity: pressed || inactive ? 0.6 : 1,
      })}
    >
      {loading
        ? <ActivityIndicator size="small" color={colors.muted2} />
        : <ProviderIcon provider={provider} color={iconColor} />
      }
      <Text style={{ fontSize: 14, fontWeight: '700', color: inactive ? colors.muted : colors.text }}>
        {label}
      </Text>
      {comingSoon && (
        <View style={{
          backgroundColor: colors.bg2,
          paddingHorizontal: 7, paddingVertical: 2,
          borderRadius: 9999, marginLeft: 2,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted }}>
            Próximamente
          </Text>
        </View>
      )}
    </Pressable>
  );
}
