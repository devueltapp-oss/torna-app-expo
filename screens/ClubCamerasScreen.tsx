import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import type { useClubCameras } from '../hooks/useClubCameras';

export interface ClubCamerasScreenProps extends ReturnType<typeof useClubCameras> { onBack: () => void }

export function ClubCamerasScreen({
  cameras, selected, loading, busy, ssid, stopped, status, error, linked, pending,
  configs, configsLoading, selectedConfigId, selectConfig, createConfig,
  setStopped, load, start, select, cancel, onBack,
}: ClubCamerasScreenProps) {
  const { colors } = useTheme();
  const button = { minHeight: 48, borderRadius: 12, padding: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line };
  const input = { ...button, fontFamily: fonts.regular, color: colors.text, fontSize: 16 };
  // Nueva configuración de WiFi inline (2026-10-02) — reemplaza el campo libre
  // de SSID/password: ahora se elige una `CameraConfig` guardada o se crea una.
  const [newConfigOpen, setNewConfigOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newSsid, setNewSsid] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [creatingConfig, setCreatingConfig] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const canCreateConfig = !!newName && !!newSsid && !creatingConfig;
  const closeNewConfig = () => { setNewConfigOpen(false); setNewName(''); setNewSsid(''); setNewPassword(''); setCreateError(''); };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Pressable accessibilityRole="button" onPress={() => onBack()} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.accentText }}>Volver a la partida</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.bold, fontSize: 26, fontWeight: '800', color: colors.text }}>Conectar cámara</Text>
        <Text style={{ fontFamily: fonts.regular, color: colors.muted2, lineHeight: 21 }}>Encendé la GoPro y activá su modo de emparejamiento. Mantené el teléfono cerca y esta pantalla abierta hasta terminar.</Text>
        {loading ? <ActivityIndicator accessibilityLabel="Cargando cámaras" /> : cameras.map((camera) => (
          <Pressable key={camera.id} accessibilityRole="radio" accessibilityState={{ checked: selected?.id === camera.id, disabled: busy || !!pending }}
            disabled={busy || !!pending} onPress={() => { select(camera); }}
            style={[button, { borderColor: selected?.id === camera.id ? colors.accentText : colors.line }]}>
            <Text style={{ fontFamily: fonts.bold, color: colors.text, fontWeight: '700' }}>{camera.identifier}</Text>
            <Text style={{ fontFamily: fonts.regular, color: colors.muted2 }}>{camera.bleName ? `GoPro ${camera.bleName}` : 'Configurá el nombre Bluetooth en Desktop antes de enlazar.'}</Text>
            {linked.has(camera.id) && <Text style={{ fontFamily: fonts.regular, color: colors.accentText }}>Enlace guardado en esta sesión</Text>}
          </Pressable>
        ))}
        {!loading && !cameras.length && <Text style={{ fontFamily: fonts.regular, color: colors.muted2 }}>No hay cámaras disponibles. Registrá la cámara de tu club en Desktop y actualizá esta lista.</Text>}
        {!busy && !pending && <Pressable accessibilityRole="button" onPress={() => void load()} style={button}><Text style={{ fontFamily: fonts.regular, color: colors.accentText }}>Actualizar cámaras</Text></Pressable>}
        {!pending && <>
          <Text style={{ fontFamily: fonts.regular, color: colors.text }}>Elegí la red WiFi para esta cámara</Text>
          <Text style={{fontFamily: fonts.regular, color: colors.muted2}}>Al enlazar, esta red quedará asignada a la cámara para las próximas conexiones. También podés agregar una red nueva.</Text>
          {configsLoading ? <ActivityIndicator accessibilityLabel="Cargando configuraciones de WiFi" /> : configs.map((cfg) => (
            <Pressable key={cfg.id} accessibilityRole="radio" accessibilityState={{ checked: selectedConfigId === cfg.id, disabled: busy }}
              disabled={busy} onPress={() => selectConfig(cfg.id)}
              style={[button, { borderColor: selectedConfigId === cfg.id ? colors.accentText : colors.line }]}>
              <Text style={{ fontFamily: fonts.bold, color: colors.text, fontWeight: '700' }}>{cfg.name}</Text>
              <Text style={{ fontFamily: fonts.regular, color: colors.muted2 }}>{cfg.wifiSsid}</Text>
            </Pressable>
          ))}
          {!configsLoading && !configs.length && !newConfigOpen && (
            <Text style={{ fontFamily: fonts.regular, color: colors.muted2 }}>Todavía no hay configuraciones de WiFi guardadas para tu club.</Text>
          )}
          {!newConfigOpen && (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setNewConfigOpen(true)} style={button}>
              <Text style={{ fontFamily: fonts.regular, color: colors.accentText }}>+ Nueva configuración de WiFi</Text>
            </Pressable>
          )}
          {newConfigOpen && <>
            <TextInput accessibilityLabel="Nombre de la configuración" placeholder="Nombre (ej. WiFi del club)" placeholderTextColor={colors.muted} value={newName} onChangeText={setNewName} editable={!creatingConfig} style={input} />
            <TextInput accessibilityLabel="Nombre de la red WiFi" placeholder="Nombre de la red" placeholderTextColor={colors.muted} value={newSsid} onChangeText={setNewSsid} editable={!creatingConfig} autoCapitalize="none" autoCorrect={false} style={input} />
            <TextInput accessibilityLabel="Contraseña de la red WiFi" placeholder="Contraseña" placeholderTextColor={colors.muted} value={newPassword} onChangeText={setNewPassword} editable={!creatingConfig} secureTextEntry autoCapitalize="none" autoCorrect={false} style={input} />
            {!!createError && <Text accessibilityRole="alert" style={{ fontFamily: fonts.regular, color: colors.text }}>{createError}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" disabled={creatingConfig} onPress={closeNewConfig} style={[button, { flex: 1 }]}>
                <Text style={{ fontFamily: fonts.regular, color: colors.text }}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!canCreateConfig} onPress={async () => {
                setCreatingConfig(true); setCreateError('');
                try { await createConfig({ name: newName, wifiSsid: newSsid, wifiPassword: newPassword }); closeNewConfig(); }
                catch (e) { setCreateError(e instanceof Error ? e.message : 'No se pudo guardar la configuración.'); }
                finally { setCreatingConfig(false); }
              }} style={[button, { flex: 1, opacity: canCreateConfig ? 1 : 0.45 }]}>
                <Text style={{ fontFamily: fonts.bold, color: colors.accentText, fontWeight: '800' }}>{creatingConfig ? 'Guardando…' : 'Guardar configuración'}</Text>
              </Pressable>
            </View>
          </>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Switch accessibilityLabel="El preview y la transmisión de esta cámara están detenidos" value={stopped} onValueChange={setStopped} disabled={busy} />
            <Text style={{ fontFamily: fonts.regular, flex: 1, color: colors.text }}>El preview y la transmisión de esta cámara están detenidos.</Text>
          </View>
        </>}
        {!!error && <Text accessibilityRole="alert" style={{ fontFamily: fonts.regular, color: colors.text }}>{error}</Text>}
        {!!status && <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.regular, color: colors.text }}>{status}</Text>}
        {pending && !busy && <Text style={{ fontFamily: fonts.regular, color: colors.muted2 }}>La configuración de la cámara está lista. Reintentá guardar sin volver a enlazar por Bluetooth.</Text>}
        {busy ? <>
          <ActivityIndicator accessibilityLabel="Enlazando cámara" />
          <Pressable accessibilityRole="button" onPress={() => cancel()} style={button}><Text style={{ fontFamily: fonts.regular, color: colors.accentText }}>Cancelar enlace</Text></Pressable>
        </> : <Pressable accessibilityRole="button" disabled={!pending && (!selected?.bleName || !ssid || !stopped)}
          accessibilityState={{ disabled: !pending && (!selected?.bleName || !ssid || !stopped) }} onPress={() => void start()}
          style={[button, { opacity: !pending && (!selected?.bleName || !ssid || !stopped) ? 0.45 : 1 }]}>
          <Text style={{ fontFamily: fonts.bold, color: colors.accentText, fontWeight: '800' }}>{pending ? 'Reintentar guardado' : 'Enlazar cámara'}</Text>
        </Pressable>}
      </ScrollView>
    </SafeAreaView>
  );
}
