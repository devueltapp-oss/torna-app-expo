/**
 * PlayerSettingsScreen — accesible desde el ícono ⚙ del perfil propio.
 *
 *   overview  → resumen + 3 cards: Editar perfil, Cambiar contraseña, Tema
 *   profile   → nombre / username editables; club readonly (lo administra el admin)
 *   password  → contraseña actual + nueva + confirmar + checklist
 *
 * El control de tema usa el ThemeProvider real (light / dark / system),
 * persistido en AsyncStorage por la propia provider.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Lock, Sun, Moon, MonitorSmartphone } from 'lucide-react-native';
import { useTheme, ThemeMode } from '../theme';
import { Avatar, Button, Input, AppHeader, SectionHeader } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { ProfileOwner } from '../data/mocks';

type Section = 'overview' | 'profile' | 'password';

export interface PlayerSettingsScreenProps {
  owner: ProfileOwner;
  onBack: () => void;
  onSignOut?: () => void;
  activeTab?: TabId;
  onChangeTab?: (id: TabId) => void;
}

export function PlayerSettingsScreen({ owner, onBack, onSignOut, activeTab, onChangeTab }: PlayerSettingsScreenProps) {
  const { colors, mode, setMode } = useTheme();
  const [section, setSection] = React.useState<Section>('overview');
  const [name, setName]         = React.useState(owner.name);
  const [username, setUsername] = React.useState(owner.username);
  const [pwCurrent, setPwCurrent] = React.useState('');
  const [pwNew, setPwNew]         = React.useState('');
  const [pwConfirm, setPwConfirm] = React.useState('');

  const titleMap: Record<Section, string> = {
    overview: 'Configuración',
    profile:  'Editar perfil',
    password: 'Cambiar contraseña',
  };

  function back() {
    if (section !== 'overview') setSection('overview');
    else onBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title={titleMap[section]}
        left={<Pressable onPress={back}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: onChangeTab ? 96 : 24 }}>
        {section === 'overview' && (
          <OverviewSection
            colors={colors} name={name} username={username}
            mode={mode} onChangeMode={setMode}
            onEditProfile={() => setSection('profile')}
            onChangePassword={() => setSection('password')}
            onSignOut={onSignOut}
          />
        )}

        {section === 'profile' && (
          <ProfileSection
            colors={colors} name={name} username={username} club={owner.club}
            onChangeName={setName} onChangeUsername={setUsername}
            onCancel={() => setSection('overview')}
            onSave={() => setSection('overview')}
          />
        )}

        {section === 'password' && (
          <PasswordSection
            colors={colors}
            pwCurrent={pwCurrent} pwNew={pwNew} pwConfirm={pwConfirm}
            onChangeCurrent={setPwCurrent} onChangeNew={setPwNew} onChangeConfirm={setPwConfirm}
            onCancel={() => setSection('overview')}
            onSave={() => setSection('overview')}
          />
        )}
      </ScrollView>

      {onChangeTab && <BottomTabBar role="player" active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}

/* ─────────────────  OVERVIEW  ───────────────── */

function OverviewSection({
  colors, name, username, mode, onChangeMode,
  onEditProfile, onChangePassword, onSignOut,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  name: string; username: string;
  mode: ThemeMode; onChangeMode: (m: ThemeMode) => void;
  onEditProfile: () => void; onChangePassword: () => void;
  onSignOut?: () => void;
}) {
  return (
    <>
      {/* Identidad */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.bg2,
      }}>
        <Avatar name={name} size={56}/>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{name}</Text>
          <Text style={{ fontSize: 12, color: colors.muted2 }}>{username}</Text>
        </View>
        <Pressable onPress={onEditProfile} style={{
          backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
        }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 11 }}>Editar</Text>
        </Pressable>
      </View>

      {/* CUENTA */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <SectionHeader title="Cuenta"/>
      </View>
      <SettingsRow label="Editar perfil"      value={username}     onPress={onEditProfile}/>
      <SettingsRow label="Cambiar contraseña" value="••••••••"     onPress={onChangePassword}/>

      {/* APARIENCIA */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <SectionHeader title="Apariencia"/>
      </View>
      <View style={{
        marginHorizontal: 16, padding: 6, backgroundColor: colors.bg2, borderRadius: 12,
        flexDirection: 'row', gap: 4,
      }}>
        <ThemeSegment mode="light"  current={mode} label="Claro"   icon={<Sun size={18} color={mode === 'light' ? colors.ink : colors.text}/>}  onChange={onChangeMode}/>
        <ThemeSegment mode="dark"   current={mode} label="Oscuro"  icon={<Moon size={18} color={mode === 'dark' ? colors.ink : colors.text}/>}  onChange={onChangeMode}/>
        <ThemeSegment mode="system" current={mode} label="Sistema" icon={<MonitorSmartphone size={18} color={mode === 'system' ? colors.ink : colors.text}/>} onChange={onChangeMode}/>
      </View>
      <Text style={{ paddingHorizontal: 18, paddingTop: 6, fontSize: 11, color: colors.muted2 }}>
        Tu elección se guarda en el dispositivo.
      </Text>

      {/* SESIÓN */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <SectionHeader title="Sesión"/>
      </View>
      <SettingsRow label="Cerrar sesión" value="" onPress={onSignOut}/>

      <Text style={{ paddingHorizontal: 18, paddingTop: 20, fontSize: 11, color: colors.muted2 }}>
        Torna v1.0.0
      </Text>
    </>
  );
}

function ThemeSegment({ mode, current, label, icon, onChange }: {
  mode: ThemeMode; current: ThemeMode; label: string;
  icon: React.ReactNode; onChange: (m: ThemeMode) => void;
}) {
  const { colors } = useTheme();
  const on = mode === current;
  return (
    <Pressable onPress={() => onChange(mode)} style={{
      flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
      backgroundColor: on ? colors.accent : 'transparent',
      alignItems: 'center', gap: 4,
    }}>
      {icon}
      <Text style={{ fontSize: 12, fontWeight: '800', color: on ? colors.ink : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ─────────────────  PROFILE  ───────────────── */

function ProfileSection({
  colors, name, username, club, onChangeName, onChangeUsername, onCancel, onSave,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  name: string; username: string; club: string;
  onChangeName: (s: string) => void; onChangeUsername: (s: string) => void;
  onCancel: () => void; onSave: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} size={64}/>
        <Pressable style={{
          borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        }}>
          <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 12 }}>Cambiar foto</Text>
        </Pressable>
      </View>

      <Input label="Nombre" value={name} onChangeText={onChangeName}/>
      <Input label="Username" value={username} onChangeText={onChangeUsername}
        hint="Cómo te encuentran otros jugadores."/>
      <Input label="Club principal" value={club} onChangeText={() => {}} disabled
        hint="Lo administra el club. Pedile al admin si necesitás cambiarlo."/>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="soft" size="lg" onPress={onCancel}>Cancelar</Button>
        <View style={{ flex: 1 }}>
          <Button fullWidth size="lg" onPress={onSave}>Guardar cambios</Button>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────  PASSWORD  ───────────────── */

function PasswordSection({
  colors,
  pwCurrent, pwNew, pwConfirm,
  onChangeCurrent, onChangeNew, onChangeConfirm,
  onCancel, onSave,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  pwCurrent: string; pwNew: string; pwConfirm: string;
  onChangeCurrent: (s: string) => void; onChangeNew: (s: string) => void; onChangeConfirm: (s: string) => void;
  onCancel: () => void; onSave: () => void;
}) {
  const mismatch = pwConfirm && pwNew !== pwConfirm;
  const checks = [
    { ok: pwNew.length >= 8,            label: 'Al menos 8 caracteres' },
    { ok: /[A-Z]/.test(pwNew),          label: 'Una letra mayúscula' },
    { ok: /[0-9]/.test(pwNew),          label: 'Un número' },
    { ok: !!pwCurrent,                  label: 'Contraseña actual ingresada' },
  ];
  const allOk = checks.every(c => c.ok) && !mismatch;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
      <Input label="Contraseña actual" secureTextEntry value={pwCurrent}
        icon={<Lock size={16} color={colors.muted}/>}
        onChangeText={onChangeCurrent}/>
      <Input label="Nueva contraseña" secureTextEntry value={pwNew}
        icon={<Lock size={16} color={colors.muted}/>}
        onChangeText={onChangeNew}/>
      <Input label="Confirmar nueva contraseña" secureTextEntry value={pwConfirm}
        icon={<Lock size={16} color={colors.muted}/>}
        onChangeText={onChangeConfirm}
        error={mismatch ? 'No coincide con la nueva contraseña.' : null}/>

      <View style={{ backgroundColor: colors.bg2, borderRadius: 10, padding: 10, gap: 4 }}>
        {checks.map(c => (
          <Text key={c.label} style={{
            fontSize: 11, color: c.ok ? colors.accentText : colors.muted2,
            fontWeight: c.ok ? '800' : '600',
          }}>
            {c.ok ? '✓' : '•'} {c.label}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="soft" size="lg" onPress={onCancel}>Cancelar</Button>
        <View style={{ flex: 1 }}>
          <Button fullWidth size="lg" variant={allOk ? 'primary' : 'disabled'}
            onPress={allOk ? onSave : undefined}>
            Actualizar
          </Button>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────  Helpers  ───────────────── */

function SettingsRow({ label, value, onPress }: {
  label: string; value: string; onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line,
      opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? (
          <Text style={{ fontSize: 13, color: colors.muted2, maxWidth: 160 }} numberOfLines={1}>{value}</Text>
        ) : null}
        {onPress ? <ChevronRight size={16} color={colors.muted2}/> : null}
      </View>
    </Pressable>
  );
}
