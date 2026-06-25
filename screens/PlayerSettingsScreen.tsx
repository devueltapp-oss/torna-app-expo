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
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Lock, Sun, Moon, MonitorSmartphone } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, ThemeMode } from '../theme';
import { Avatar, Button, Input, AppHeader, SectionHeader } from '../components/ui';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfilePicture, uploadFrontPage } from '../api/profile';
import type { ProfileOwner } from '../data/types';

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
  const { user, updateProfilePicture, updateFrontPage, changePassword } = useAuth();
  const [section, setSection] = React.useState<Section>('overview');
  const [name, setName]         = React.useState(owner.name);
  const [username, setUsername] = React.useState(owner.username);
  const [pwCurrent, setPwCurrent] = React.useState('');
  const [pwNew, setPwNew]         = React.useState('');
  const [pwConfirm, setPwConfirm] = React.useState('');
  const [pwSubmitting, setPwSubmitting] = React.useState(false);
  const [pwError, setPwError]     = React.useState<string | null>(null);

  async function handleChangePassword() {
    setPwError(null);
    setPwSubmitting(true);
    try {
      await changePassword(pwCurrent, pwNew);
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      setSection('overview');
      Alert.alert('Listo', 'Tu contraseña fue actualizada.');
    } catch (err: any) {
      setPwError(friendlyPasswordError(err));
    } finally {
      setPwSubmitting(false);
    }
  }

  // Foto de perfil — única imagen subible. Sube a B2 y persiste vía PATCH /user/me.
  const [avatar, setAvatar] = React.useState<string | undefined>(user?.profilePicture);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [viewer, setViewer] = React.useState(false);

  async function changePhoto() {
    if (!user?.id) return;
    setPhotoError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePicture(user.id, result.assets[0].uri);
      setAvatar(url);
      updateProfilePicture(url);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo actualizar la foto.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Foto de portada — sube a B2 y persiste vía PATCH /user/me { frontPage }.
  const [cover, setCover] = React.useState<string | undefined>(user?.frontPage);
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [coverError, setCoverError] = React.useState<string | null>(null);

  async function changeCover() {
    if (!user?.id) return;
    setCoverError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingCover(true);
    try {
      const url = await uploadFrontPage(user.id, result.assets[0].uri);
      setCover(url);
      updateFrontPage(url);
    } catch (err) {
      setCoverError(err instanceof Error ? err.message : 'No se pudo actualizar la portada.');
    } finally {
      setUploadingCover(false);
    }
  }

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
            colors={colors} name={name} username={username} avatar={avatar}
            mode={mode} onChangeMode={setMode}
            onEditProfile={() => setSection('profile')}
            onChangePassword={() => setSection('password')}
            onViewPhoto={() => avatar && setViewer(true)}
            onSignOut={onSignOut}
          />
        )}

        {section === 'profile' && (
          <ProfileSection
            colors={colors} name={name} username={username} club={owner.club}
            avatar={avatar} uploadingPhoto={uploadingPhoto} photoError={photoError}
            onChangePhoto={changePhoto}
            onViewPhoto={() => avatar && setViewer(true)}
            cover={cover} uploadingCover={uploadingCover} coverError={coverError}
            onChangeCover={changeCover}
            onChangeName={setName} onChangeUsername={setUsername}
            onCancel={() => setSection('overview')}
            onSave={() => setSection('overview')}
          />
        )}

        {section === 'password' && (
          <PasswordSection
            colors={colors}
            pwCurrent={pwCurrent} pwNew={pwNew} pwConfirm={pwConfirm}
            onChangeCurrent={(v) => { setPwCurrent(v); setPwError(null); }}
            onChangeNew={(v) => { setPwNew(v); setPwError(null); }}
            onChangeConfirm={(v) => { setPwConfirm(v); setPwError(null); }}
            submitting={pwSubmitting}
            error={pwError}
            onCancel={() => setSection('overview')}
            onSave={handleChangePassword}
          />
        )}
      </ScrollView>

      {onChangeTab && <BottomTabBar role="player" active={activeTab ?? 'profile'} onChange={onChangeTab}/>}

      <ImageViewerModal visible={viewer} uri={avatar} onClose={() => setViewer(false)}/>
    </SafeAreaView>
  );
}

/* ─────────────────  OVERVIEW  ───────────────── */

function OverviewSection({
  colors, name, username, avatar, mode, onChangeMode,
  onEditProfile, onChangePassword, onViewPhoto, onSignOut,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  name: string; username: string; avatar?: string;
  mode: ThemeMode; onChangeMode: (m: ThemeMode) => void;
  onEditProfile: () => void; onChangePassword: () => void;
  onViewPhoto: () => void;
  onSignOut?: () => void;
}) {
  return (
    <>
      {/* Identidad */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.bg2,
      }}>
        <Pressable onPress={onViewPhoto}>
          <Avatar name={name} size={56} imageUri={avatar}/>
        </Pressable>
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
  colors, name, username, club, avatar, uploadingPhoto, photoError, onChangePhoto, onViewPhoto,
  cover, uploadingCover, coverError, onChangeCover,
  onChangeName, onChangeUsername, onCancel, onSave,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  name: string; username: string; club: string;
  avatar?: string; uploadingPhoto: boolean; photoError: string | null;
  onChangePhoto: () => void;
  onViewPhoto: () => void;
  cover?: string; uploadingCover: boolean; coverError: string | null;
  onChangeCover: () => void;
  onChangeName: (s: string) => void; onChangeUsername: (s: string) => void;
  onCancel: () => void; onSave: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={onViewPhoto}>
          <Avatar name={name} size={64} imageUri={avatar}/>
        </Pressable>
        <Pressable
          onPress={uploadingPhoto ? undefined : onChangePhoto}
          style={{
            borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
            flexDirection: 'row', alignItems: 'center', gap: 8, opacity: uploadingPhoto ? 0.6 : 1,
          }}>
          {uploadingPhoto ? <ActivityIndicator size="small" color={colors.text2}/> : null}
          <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 12 }}>
            {uploadingPhoto ? 'Subiendo…' : 'Cambiar foto'}
          </Text>
        </Pressable>
      </View>
      {photoError ? (
        <Text style={{ fontSize: 11, color: colors.warnFg, fontWeight: '700' }}>{photoError}</Text>
      ) : null}

      {/* Foto de portada */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text2 }}>Portada</Text>
        <Pressable
          onPress={uploadingCover ? undefined : onChangeCover}
          style={{
            height: 120, borderRadius: 12, overflow: 'hidden',
            borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.bg2,
            alignItems: 'center', justifyContent: 'center', opacity: uploadingCover ? 0.6 : 1,
          }}>
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover"/>
          ) : null}
          <View style={{ position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {uploadingCover ? <ActivityIndicator size="small" color={colors.text2}/> : null}
            <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 12 }}>
              {uploadingCover ? 'Subiendo…' : cover ? 'Cambiar portada' : 'Agregar portada'}
            </Text>
          </View>
        </Pressable>
        {coverError ? (
          <Text style={{ fontSize: 11, color: colors.warnFg, fontWeight: '700' }}>{coverError}</Text>
        ) : null}
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
  submitting, error,
  onCancel, onSave,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  pwCurrent: string; pwNew: string; pwConfirm: string;
  onChangeCurrent: (s: string) => void; onChangeNew: (s: string) => void; onChangeConfirm: (s: string) => void;
  submitting: boolean; error: string | null;
  onCancel: () => void; onSave: () => void;
}) {
  const mismatch = pwConfirm && pwNew !== pwConfirm;
  const checks = [
    { ok: pwNew.length >= 8,            label: 'Al menos 8 caracteres' },
    { ok: /[A-Z]/.test(pwNew),          label: 'Una letra mayúscula' },
    { ok: /[0-9]/.test(pwNew),          label: 'Un número' },
    { ok: !!pwCurrent,                  label: 'Contraseña actual ingresada' },
  ];
  const allOk = checks.every(c => c.ok) && !mismatch && !submitting;

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

      {error ? (
        <View style={{ backgroundColor: colors.warnBg, borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 13, color: colors.warnFg, lineHeight: 18 }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="soft" size="lg" onPress={onCancel}>Cancelar</Button>
        <View style={{ flex: 1 }}>
          <Button fullWidth size="lg" variant={allOk ? 'primary' : 'disabled'}
            loading={submitting}
            onPress={allOk ? onSave : undefined}>
            Actualizar
          </Button>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────  Helpers  ───────────────── */

// Mapea errores de Firebase a mensajes legibles para el cambio de contraseña.
export function friendlyPasswordError(err: any): string {
  const msg: string = err?.code ?? err?.message ?? '';

  if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
    return 'La contraseña actual es incorrecta.';
  }
  if (msg.includes('weak-password')) {
    return 'La nueva contraseña es muy débil. Usá al menos 8 caracteres.';
  }
  if (msg.includes('requires-recent-login')) {
    return 'Por seguridad, volvé a iniciar sesión e intentá de nuevo.';
  }
  if (msg.includes('too-many-requests')) {
    return 'Demasiados intentos. Esperá unos minutos y volvé a intentar.';
  }
  if (msg.includes('user-not-found') || msg.includes('user-mismatch')) {
    return 'Esta cuenta no usa contraseña (entraste con Google/Apple).';
  }
  if (msg.includes('network') || msg.includes('Network')) {
    return 'Sin conexión a internet. Verificá tu red e intentá de nuevo.';
  }
  return 'No se pudo actualizar la contraseña. Intentá de nuevo.';
}

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
