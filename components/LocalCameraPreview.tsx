import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import type { ViewProps } from 'react-native';
import { useTheme } from '../theme';
import { openLocalPreview } from '../services/cohn/localPreview';
import type { ClubIdentity, CohnCredentials } from '../services/cohn/provision';

const PreviewView = Platform.OS === 'android' ? requireNativeViewManager<ViewProps & { active: boolean; onReady: () => void; onFrame: () => void; onFailure: () => void }>('TornaCohn') : View;

export function LocalCameraPreview({ user, credentials, name, onClose, onFrame, onGoLive }: {
  user: ClubIdentity; credentials: CohnCredentials; name: string; onClose: () => void; onFrame: () => void;
  /** Cierra el preview local y arranca la transmisión real (RTMP nativo + marcar partida EN VIVO). */
  onGoLive: () => void;
}) {
  const { colors } = useTheme();
  const [error, setError] = useState('');
  const [received, setReceived] = useState(false);
  const frameReceived = useRef(false);
  const [closing, setClosing] = useState(false);
  const closeRef = useRef<() => Promise<void>>(async () => {});
  const frameRef = useRef(onFrame); frameRef.current = onFrame;
  const [active, setActive] = useState(false);
  const readyRef = useRef<() => void>(() => {});
  const failureRef = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    const abort = new AbortController();
    const fail = (message: string) => { if (alive) setError(message); };
    // Open the local UDP receiver BEFORE the camera is told to start sending:
    // GoPro pushes the stream immediately once `start` responds and does not
    // retry packets sent before this phone's socket was listening.
    const onBeforeStart = () => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('No se pudo abrir el receptor de video.')), 10000);
      const cancelled = () => finish(new Error('Preview cancelado.'));
      const finish = (error?: Error) => {
        clearTimeout(timer); abort.signal.removeEventListener('abort', cancelled);
        readyRef.current = () => {};
        error ? reject(error) : resolve();
      };
      readyRef.current = () => finish();
      abort.signal.addEventListener('abort', cancelled, { once: true });
      if (abort.signal.aborted) { cancelled(); return; }
      setActive(true);
    });
    failureRef.current = () => { fail('El video local se interrumpió. Cerrá el preview y reintentá.'); abort.abort(); setActive(false); };
    const started = openLocalPreview(user, credentials, abort.signal, fail, onBeforeStart);
    const timeout = setTimeout(() => { if (!frameReceived.current) fail('No llegó imagen. Verificá que el teléfono y la cámara estén en el mismo WiFi, sin aislamiento de dispositivos.'); }, 30000);
    closeRef.current = async () => {
      abort.abort(); clearTimeout(timeout); if (alive) setActive(false);
      const session = await started.catch(() => null);
      await session?.close();
    };
    started.catch(error => {
      const message = String(error?.message ?? '');
      if (/ssl|cert|trust|handshake/i.test(message)) fail('No se pudo validar el certificado de la cámara. Volvé a conectar la GoPro por Bluetooth y reintentá.');
      else if (/timeout|timed out|connect|network|route/i.test(message)) fail('No se pudo alcanzar la cámara por WiFi. El teléfono debe estar en la misma red, sin aislamiento de dispositivos.');
      else fail('La cámara no pudo iniciar el preview local. Cerrá el preview y reintentá.');
      abort.abort(); if (alive) setActive(false);
    });
    const background = AppState.addEventListener('change', state => {
      if (state === 'background') { void closeRef.current().catch(() => {}); onClose(); }
    });
    return () => {
      alive = false; clearTimeout(timeout); background.remove();
      void closeRef.current().catch(() => {});
    };
  }, [credentials, user.id]);
  return <View style={{ gap: 12 }}>
    <Text style={{ color: colors.text, fontWeight: '800' }}>{name} · Preview local</Text>
    <PreviewView active={active} onReady={() => readyRef.current()} onFailure={() => failureRef.current()} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.ink }}
      onFrame={() => { frameReceived.current = true; setReceived(true); setError(''); frameRef.current(); }} />
    {!received && !error && <ActivityIndicator accessibilityLabel="Esperando imagen de la cámara" />}
    <Text style={{ color: colors.muted2 }}>Solo visible en este teléfono. No se está publicando ni grabando esta imagen.</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.text }}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={closing} onPress={async () => {
      setClosing(true);
      try { await closeRef.current(); onGoLive(); }
      catch { setError('No se confirmó el cierre en la cámara. Revisá su conexión.'); setClosing(false); }
    }} style={{ padding: 16, borderRadius: 12, backgroundColor: colors.bg2 }}>
      <Text style={{ color: colors.accentText, fontWeight: '700' }}>{closing ? 'Cerrando…' : 'Cerrar preview e iniciar transmisión'}</Text>
    </Pressable>
  </View>;
}
