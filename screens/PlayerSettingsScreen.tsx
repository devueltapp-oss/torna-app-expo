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
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, Alert, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Lock, Sun, Moon, MonitorSmartphone, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, ThemeMode } from '../theme';
import { fonts } from '../theme/tokens';
import { useNearbyLocation } from '../hooks/useNearbyLocation';
import { Avatar, Button, Input, AppHeader, SectionHeader } from '../components/ui';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfilePicture, uploadFrontPage, updateMyCategory, updateMyProfile } from '../api/profile';
import { reverseAddress, searchAddress, type AddressSuggestion } from '../api/geo';
import { cityFromSuggestion, isRegionVisible, packRegion, unpackRegion } from '../lib/region';
import { precisePosition } from '../lib/location';
import type { ProfileOwner } from '../data/types';

type Section = 'overview' | 'profile' | 'password';

/**
 * Niveles de juego (`User.category`). Convención de pádel: **1 es el más alto**
 * y 7 la iniciación — al revés de lo que la gente asume, que es justamente por
 * lo que cada opción lleva su nombre además del número.
 *
 * ⚠️ Los `value` son el contrato con el backend (`@Min(1) @Max(7)`): se pueden
 * cambiar las etiquetas, no los números.
 */
const PLAY_LEVELS: { value: number; label: string; hint: string }[] = [
  { value: 1, label: 'Nivel 1 · Profesional',  hint: 'Compites en circuito' },
  { value: 2, label: 'Nivel 2 · Avanzado alto', hint: 'Competencia habitual' },
  { value: 3, label: 'Nivel 3 · Avanzado',      hint: 'Dominas todos los golpes' },
  { value: 4, label: 'Nivel 4 · Intermedio alto', hint: 'Juegas con constancia' },
  { value: 5, label: 'Nivel 5 · Intermedio',    hint: 'Ya tienes partidos jugados' },
  { value: 6, label: 'Nivel 6 · Principiante',  hint: 'Empezando a jugar' },
  { value: 7, label: 'Nivel 7 · Iniciación',    hint: 'Primera vez en una cancha' },
];

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
  const [category, setCategory] = React.useState<number | null>(owner.category ?? null);
  const [categoryError, setCategoryError] = React.useState<string | null>(null);

  /**
   * Ciudad (`User.region`). Es **texto editable**, no una posición viva: el GPS
   * solo sirve para rellenarla de una vez. Se guarda al tocar "Guardar", junto
   * con nombre y username.
   */
  const [region, setRegion] = React.useState(unpackRegion(owner.location));
  const [locatingCity, setLocatingCity] = React.useState(false);
  const [cityError, setCityError] = React.useState<string | null>(null);

  /**
   * Mostrar la ciudad en el perfil público. **Opcional y aparte de tenerla
   * cargada**: que la app sepa de dónde sos y que se lo enseñe a los demás son
   * dos decisiones distintas.
   *
   * Se persiste como un prefijo en el propio `User.region` (`"~"` = oculta) para
   * no pedir una columna nueva por un booleano. Ver `packRegion`/`unpackRegion`.
   */
  const [showRegion, setShowRegion] = React.useState(() => isRegionVisible(owner.location));

  /**
   * Sugerencias de ciudad (Geoapify vía `GET /geo/autocomplete`).
   *
   * ⚠️ **Es lo que evita los errores de tipeo**: elegir de la lista guarda un
   * nombre real. Pero escribir libre sigue permitido — si el proveedor no está
   * configurado o no contesta, el campo tiene que seguir sirviendo.
   */
  const [citySuggestions, setCitySuggestions] = React.useState<AddressSuggestion[]>([]);
  // Marca que el texto salió de la lista, para no volver a buscar por lo elegido.
  const cityChosen = React.useRef(false);

  React.useEffect(() => {
    if (cityChosen.current || region.trim().length < 3) {
      setCitySuggestions([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const found = await searchAddress(region.trim());
        // Se deduplica por ciudad: el proveedor devuelve una entrada por calle y
        // acá se elige una CIUDAD, no una dirección.
        const vistas = new Set<string>();
        const soloCiudades = found
          .map((s) => ({ ...s, label: cityFromSuggestion(s) }))
          .filter((s) => s.label && !vistas.has(s.label) && vistas.add(s.label))
          .slice(0, 5);
        setCitySuggestions(soloCiudades);
      } catch {
        setCitySuggestions([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [region]);

  const handlePickCity = React.useCallback((s: AddressSuggestion) => {
    cityChosen.current = true;
    setRegion(s.label);
    setCitySuggestions([]);
    setCityError(null);
  }, []);

  /**
   * Toma la posición una vez y resuelve la ciudad con `GET /geo/reverse`.
   *
   * No guarda coordenadas en ningún lado: lo único que queda es el nombre de la
   * ciudad, y solo si el usuario después toca Guardar. Si Geoapify no está
   * configurado o falla, se avisa y el campo se puede escribir a mano — que es
   * el camino que siempre tiene que seguir funcionando.
   */
  /**
   * Guarda nombre, username y ciudad. Antes "Guardar" solo cerraba la sección
   * sin persistir nada — los campos volvían a su valor al reabrirla.
   */
  const [savingProfile, setSavingProfile] = React.useState(false);
  async function handleSaveProfile() {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      //  mete la visibilidad en el propio string (ver su nota).
      await updateMyProfile({ name, username, region: packRegion(region, showRegion) });
      setSection('overview');
    } catch (e) {
      Alert.alert('No se pudo guardar', (e as Error)?.message ?? 'Intenta de nuevo.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUseMyCity() {
    setLocatingCity(true);
    setCityError(null);
    try {
      const { coords, reason } = await precisePosition();
      if (!coords) {
        setCityError(
          reason === 'denied'
            ? 'Necesitamos permiso de ubicación. Puedes escribir tu ciudad a mano.'
            : 'No pudimos ubicarte. Prueba al aire libre o escríbela a mano.',
        );
        return;
      }
      const found = await reverseAddress(coords.latitude, coords.longitude);
      // `line2` suele traer "Ciudad Guayana 8050, Bolívar, Venezuela"; nos
      // quedamos con la primera parte, que es la ciudad.
      const ciudad = found?.line2?.split(',')[0]?.trim() || found?.label?.split(',')[0]?.trim();
      if (!ciudad) {
        setCityError('No pudimos resolver tu ciudad. Escribila a mano.');
        return;
      }
      setRegion(ciudad);
    } catch {
      setCityError('No pudimos resolver tu ciudad ahora. Escribila a mano.');
    } finally {
      setLocatingCity(false);
    }
  }
  // Aviso de partidas abiertas cercanas. El hook también late con la posición
  // mientras esta pantalla vive; el latido "de verdad" lo hace el de MainPlayer.
  const nearby = useNearbyLocation(true);

  // Se guarda al tocar el chip (no hay "Guardar" para este campo). Update
  // optimista con revert: si el PATCH falla, vuelve al valor anterior.
  async function handleChangeCategory(next: number | null) {
    const previous = category;
    setCategory(next);
    setCategoryError(null);
    if (next === null) return; // Deseleccionar es solo local: el backend no acepta null.
    try {
      await updateMyCategory(next);
    } catch {
      setCategory(previous);
      setCategoryError('No se pudo guardar la categoría. Intenta de nuevo.');
    }
  }

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
            nearby={nearby}
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
            category={category} onChangeCategory={handleChangeCategory} categoryError={categoryError}
            region={region} onChangeRegion={(v) => { cityChosen.current = false; setRegion(v); }}
            onUseMyCity={handleUseMyCity} locatingCity={locatingCity} cityError={cityError}
            citySuggestions={citySuggestions} onPickCity={handlePickCity}
            showRegion={showRegion} onChangeShowRegion={setShowRegion}
            onCancel={() => setSection('overview')}
            onSave={handleSaveProfile}
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
  onEditProfile, onChangePassword, onViewPhoto, onSignOut, nearby,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  name: string; username: string; avatar?: string;
  mode: ThemeMode; onChangeMode: (m: ThemeMode) => void;
  onEditProfile: () => void; onChangePassword: () => void;
  onViewPhoto: () => void;
  onSignOut?: () => void;
  nearby: ReturnType<typeof useNearbyLocation>;
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

      {/* PARTIDAS CERCA */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        <SectionHeader title="Partidas cerca"/>
      </View>
      <NearbyRow colors={colors} nearby={nearby}/>

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

/**
 * El opt-in de "avisame de partidas abiertas cerca".
 *
 * Dice explícitamente qué se hace con la ubicación **antes** de que el usuario
 * toque nada: es el único lugar de la app que pide una posición, y el diálogo
 * del sistema no explica para qué. Tres cosas que el copy tiene que sostener y
 * que el código cumple: no se muestra a nadie, se guarda aproximada, y apagar
 * el switch la borra.
 */
function NearbyRow({ colors, nearby }: {
  colors: ReturnType<typeof useTheme>['colors'];
  nearby: ReturnType<typeof useNearbyLocation>;
}) {
  const on = !!nearby.settings?.enabled;
  const radio = nearby.settings?.radiusKm ?? 25;

  const toggle = (next: boolean) => {
    const action = next ? nearby.enable() : nearby.disable();
    action.catch(() =>
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.'),
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.bg2, borderRadius: 12, padding: 14,
      }}>
        <MapPin size={20} color={colors.muted2}/>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
            Avisarme de partidas cerca
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 2 }}>
            Cuando alguien busque rivales a menos de {radio} km.
          </Text>
        </View>
        {nearby.loading
          ? <ActivityIndicator color={colors.accent}/>
          : <Switch value={on} onValueChange={toggle}/>}
      </View>

      {/*
        ⚠️ **Sin `on` en la condición, y es el punto entero.**
        Antes decía `{on && problem === 'denied'}`, que **nunca se cumple**: si el
        permiso se niega, `enable()` sale sin activar el flag, así que `on` queda
        en false. Resultado: el switch volvía solo, sin una palabra que lo
        explique y sin forma de recuperarse — el permiso se niega en el sistema y
        el sistema ya no vuelve a preguntar, así que este enlace es la ÚNICA
        salida.
      */}
      {nearby.problem === 'denied' && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text style={{ fontSize: 12, color: colors.text }}>
            Torna no tiene permiso de ubicación, así que no podemos activarlo.{' '}
            <Text style={{ fontFamily: fonts.bold, textDecorationLine: 'underline' }}>
              Toca para abrir Ajustes
            </Text>{' '}
            y permitir la ubicación.
          </Text>
        </Pressable>
      )}
      {nearby.problem === 'unavailable' && (
        <Text style={{ fontSize: 12, color: colors.text }}>
          No pudimos ubicarte. Prueba al aire libre e intenta de nuevo.
        </Text>
      )}

      <Text style={{ fontSize: 11, color: colors.muted2, lineHeight: 16 }}>
        Tu ubicación no se muestra a nadie ni aparece en tu perfil: solo se usa para
        decidir qué avisos te llegan. Se guarda aproximada y apagar esto la borra.
      </Text>
    </View>
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
  onChangeName, onChangeUsername, category, onChangeCategory, categoryError, onCancel, onSave,
  region, onChangeRegion, onUseMyCity, locatingCity, cityError,
  citySuggestions, onPickCity, showRegion, onChangeShowRegion,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  name: string; username: string; club: string;
  /** Ciudad del jugador (`User.region`). Texto editable; el GPS solo la rellena. */
  region: string;
  onChangeRegion: (s: string) => void;
  onUseMyCity: () => void;
  /** Sugerencias de ciudad; vacío = no mostrar la lista. */
  citySuggestions: AddressSuggestion[];
  onPickCity: (s: AddressSuggestion) => void;
  /** Mostrar la ciudad en el perfil público. Independiente de tenerla cargada. */
  showRegion: boolean;
  onChangeShowRegion: (v: boolean) => void;
  locatingCity: boolean;
  cityError: string | null;
  avatar?: string; uploadingPhoto: boolean; photoError: string | null;
  onChangePhoto: () => void;
  onViewPhoto: () => void;
  cover?: string; uploadingCover: boolean; coverError: string | null;
  onChangeCover: () => void;
  onChangeName: (s: string) => void; onChangeUsername: (s: string) => void;
  /** Categoría del jugador: 1 = más alta, 7 = iniciación. null = sin declarar. */
  category: number | null;
  onChangeCategory: (n: number | null) => void;
  categoryError: string | null;
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

      <Input label="Nombre" value={name} onChangeText={onChangeName}/>
      <Input label="Username" value={username} onChangeText={onChangeUsername}
        hint="Cómo te encuentran otros jugadores."/>
      {/*
        Ciudad. **Es un campo editable, no un rastreador.**

        El GPS es solo una comodidad para rellenarlo: se toma la posición una vez,
        se resuelve la ciudad y queda guardada como texto en `User.region`. No se
        actualiza sola ni sigue tu posición.

        ⚠️ Es un dato DISTINTO del de `src/nearby/`. Aquel es una posición
        aproximada que no se muestra en ninguna parte y solo decide a quién le
        llegan los avisos de partidas cercanas; éste es una etiqueta que vos
        eliges mostrar. No los mezcles ni derives uno del otro.
      */}
      <Input
        label="Ciudad"
        value={region}
        onChangeText={onChangeRegion}
        hint="Escribe y elige de la lista, o tómala del GPS."
      />

      {/*
        Sugerencias de Geoapify mientras se escribe. **Es lo que evita los errores
        de tipeo**: elegir de la lista guarda un nombre de ciudad real, no lo que
        se haya tecleado. Escribir libre sigue permitido — si el proveedor no está
        configurado o no responde, el campo tiene que seguir sirviendo.
      */}
      {citySuggestions.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' }}>
          {citySuggestions.map((s, i) => (
            <Pressable
              key={s.id}
              testID={`city-suggestion-${i}`}
              onPress={() => onPickCity(s)}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.line,
                backgroundColor: pressed ? colors.bg2 : 'transparent',
              })}
            >
              <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={1}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={locatingCity ? undefined : onUseMyCity}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
          opacity: pressed || locatingCity ? 0.7 : 1,
        })}
      >
        {locatingCity
          ? <ActivityIndicator size="small" color={colors.text2}/>
          : <MapPin size={14} color={colors.text2}/>}
        <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 12 }}>
          {locatingCity ? 'Ubicando…' : 'Usar mi ubicación actual'}
        </Text>
      </Pressable>
      {cityError ? (
        <Text style={{ fontSize: 11, color: colors.text }}>{cityError}</Text>
      ) : null}

      {/*
        Mostrarla es **opcional**: tener la ciudad cargada (para que la app sepa
        de dónde eres) y enseñarla en tu perfil son dos decisiones distintas, y
        la segunda es tuya.
      */}
      <Pressable
        onPress={() => onChangeShowRegion(!showRegion)}
        testID="toggle-show-city"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
      >
        <Switch value={showRegion} onValueChange={onChangeShowRegion} />
        <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>
          Mostrar mi ciudad en el perfil
        </Text>
      </Pressable>

      {/*
        ⛔ "Club principal" se eliminó el 2026-09-02: era un campo **deshabilitado**
        que solo decía "pedile al admin". Un input que no se puede escribir y no
        aporta un dato accionable es ruido en un formulario.
      */}

      {/*
        Nivel de juego — se guarda al elegirlo (PATCH /user/me).

        ⚠️ Antes eran **siete números sueltos** (1…7) sin nada que dijera qué
        significaban salvo una línea de ayuda debajo: había que saberse la
        convención de pádel para elegir. Ahora cada opción se nombra, así que se
        entiende sin leer el pie.
      */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text2 }}>Nivel de juego</Text>
        <View style={{ gap: 6 }}>
          {PLAY_LEVELS.map(({ value, label, hint }) => {
            const active = category === value;
            return (
              <Pressable
                key={value}
                testID={`level-${value}`}
                onPress={() => onChangeCategory(active ? null : value)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: active ? colors.accentSoft : 'transparent',
                  borderWidth: 1.5, borderColor: active ? colors.accentStrong : colors.line,
                  borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                }}
              >
                {/* Radio: deja claro que se elige UNO, no varios. */}
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2, borderColor: active ? colors.accentStrong : colors.lineStrong,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accentStrong }} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                    {label}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1 }}>
                    {hint}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {categoryError ? (
          <Text style={{ fontSize: 11, color: colors.warnFg, fontWeight: '700' }}>{categoryError}</Text>
        ) : null}
      </View>

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
    return 'Por seguridad, vuelve a iniciar sesión e intenta de nuevo.';
  }
  if (msg.includes('too-many-requests')) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  }
  if (msg.includes('user-not-found') || msg.includes('user-mismatch')) {
    return 'Esta cuenta no usa contraseña (entraste con Google/Apple).';
  }
  if (msg.includes('network') || msg.includes('Network')) {
    return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
  }
  return 'No se pudo actualizar la contraseña. Intenta de nuevo.';
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
