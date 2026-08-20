/**
 * services/notifications.ts — TODA la cadena de push de la app en un solo lugar.
 *
 * Antes esto vivía inline en `App.tsx` (init + listener de click) y en
 * `AuthContext` (registro del token), y entre los dos cubrían 3 de los 8 tipos
 * que el backend realmente emite. Acá está centralizado y cubierto por tests
 * (`services/__tests__/notifications.test.ts`).
 *
 * Cadena completa:
 *
 *   backend (torna-api) --OneSignal--> dispositivo
 *     · el usuario toca      → 'click'                → navegación (routing table)
 *     · la app está abierta  → 'foregroundWillDisplay'→ se muestra, salvo que ya
 *                                                       esté mirando esa pantalla
 *
 * Tres reglas que el código viejo no cumplía y por las que se perdían pushes:
 *
 * 1. **Cold start**: si la app venía cerrada, el 'click' llega ANTES de que el
 *    NavigationContainer esté montado y el `navigate` se perdía en silencio.
 *    Acá se guarda en `pendingTarget` y se aplica en `onNavigationReady()`.
 * 2. **El subscription ID puede no existir todavía** justo después de aceptar el
 *    permiso. Antes se hacía un único `getIdAsync()` y si daba null se abandonaba
 *    hasta el próximo login. Ahora, si no está, se engancha el evento 'change' de
 *    la suscripción y se registra en cuanto aparece.
 * 3. **Logout**: el `notificationId` quedaba guardado en el backend apuntando al
 *    dispositivo, así que el usuario que se fue seguía recibiendo los pushes de su
 *    cuenta en un teléfono ajeno. `clearIdentity()` lo borra y hace `OneSignal.logout()`.
 */
import { OneSignal } from 'react-native-onesignal';
import type { TabId } from '../components/BottomTabBar';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

/** `additionalData` del push tal como lo manda torna-api. */
export interface PushData {
  type?: string;
  gameId?: string;
  fromUserId?: string;
  conversationId?: string;
}

/** Pantalla a la que hay que ir cuando se toca la notificación. */
export interface PushTarget {
  name: string;
  params?: Record<string, unknown>;
}

/**
 * Tipos que emite el backend hoy, y a dónde lleva cada uno.
 *
 * | type                | emisor                              | destino    |
 * |---------------------|-------------------------------------|------------|
 * | STREAMING_STARTED   | game.controller (pasa a LIVE)       | GameDetail |
 * | RECORDING_READY     | game.service (grabación procesada)  | GameDetail |
 * | GAME_FINISHED       | game.service (partida terminada)    | GameDetail |
 * | NEW_CHAT_MESSAGE    | game.service (chat de la partida)   | GameChat   |
 * | NEW_DM_MESSAGE      | chat.service (DM 1-a-1)             | DirectChat |
 * | GAME_CANCELLED      | game.service (owner canceló)        | Juegos     |
 * | GAME_PLAYER_LEFT    | game.service (alguien se dio baja)  | Juegos     |
 * | GAME_PAIR_CANCELLED | game.service (la pareja se bajó)    | Juegos     |
 *
 * ⚠️ Se normaliza a mayúsculas a propósito: el backend en producción todavía
 * manda los tres últimos en minúscula (`game_cancelled`, `game_player_left`,
 * `game_pair_cancelled`). Aceptar ambas formas evita que la app tenga que
 * esperar al deploy del backend para que esos pushes naveguen.
 */
export function resolvePushTarget(data: PushData | null | undefined): PushTarget | null {
  const type = (data?.type ?? '').toUpperCase();
  const gamesTab: TabId = 'games';

  switch (type) {
    case 'STREAMING_STARTED':
    case 'RECORDING_READY':
    case 'GAME_FINISHED':
      return data?.gameId ? { name: 'GameDetail', params: { gameId: data.gameId } } : null;

    case 'NEW_CHAT_MESSAGE':
      return data?.gameId ? { name: 'GameChat', params: { gameId: data.gameId } } : null;

    case 'NEW_DM_MESSAGE':
      return data?.fromUserId
        ? { name: 'DirectChat', params: { userId: data.fromUserId } }
        : null;

    case 'GAME_CANCELLED':
    case 'GAME_PLAYER_LEFT':
    case 'GAME_PAIR_CANCELLED':
      // La partida ya no se puede ver (cancelada) o cambió su composición: el
      // lugar útil es el hub de partidos, no el visor del stream.
      return { name: 'MainPlayer', params: { initialTab: gamesTab } };

    default:
      return null;
  }
}

/* ─────────── estado del módulo ─────────── */

let navigationRef: React.RefObject<any> | null = null;
let navigationReady = false;
let pendingTarget: PushTarget | null = null;
let initialized = false;

function navigateTo(target: PushTarget): void {
  if (!navigationReady || !navigationRef?.current) {
    // Cold start: el árbol de navegación todavía no existe. Se aplica en onNavigationReady().
    pendingTarget = target;
    return;
  }
  navigationRef.current.navigate(target.name, target.params);
}

/**
 * Avisa que el NavigationContainer ya montó. Se llama desde su prop `onReady`.
 * Si la app se abrió desde una notificación, acá se consume ese destino pendiente.
 */
export function onNavigationReady(): void {
  navigationReady = true;
  if (!pendingTarget) return;
  const target = pendingTarget;
  pendingTarget = null;
  // setTimeout(0): deja que el primer render del stack termine antes de navegar.
  setTimeout(() => navigateTo(target), 0);
}

/** ¿El usuario ya está parado en la pantalla que abriría este push? */
function isAlreadyOnTarget(target: PushTarget | null): boolean {
  if (!target || !navigationRef?.current?.getCurrentRoute) return false;
  const current = navigationRef.current.getCurrentRoute();
  if (!current || current.name !== target.name) return false;

  const params = (current.params ?? {}) as Record<string, unknown>;
  const wanted = target.params ?? {};
  return Object.keys(wanted).every((k) => params[k] === wanted[k]);
}

/**
 * Inicializa OneSignal y engancha los listeners. Idempotente: llamarla dos veces
 * no duplica listeners (el bug clásico de registrar el 'click' en el init y otra
 * vez en el onReady, que hace navegar dos veces por cada tap).
 *
 * NO pide permiso acá: el permiso se pide después del login, en contexto
 * (`identifyUser`). Pedirlo en el arranque quema el único prompt que da iOS
 * frente a un usuario que todavía no sabe qué es la app.
 */
export function initNotifications(ref: React.RefObject<any>): void {
  navigationRef = ref;
  if (initialized) return;

  const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';
  if (!appId) {
    if (__DEV__) console.warn('[push] EXPO_PUBLIC_ONESIGNAL_APP_ID vacío — push deshabilitado');
    return;
  }

  try {
    OneSignal.initialize(appId);
    initialized = true;

    OneSignal.Notifications.addEventListener('click', (event: any) => {
      const target = resolvePushTarget(event?.notification?.additionalData);
      if (target) navigateTo(target);
    });

    // App en primer plano: no tiene sentido tapar con un banner el chat que el
    // usuario está leyendo en ese mismo momento.
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      const target = resolvePushTarget(event?.notification?.additionalData);
      if (isAlreadyOnTarget(target)) event.preventDefault?.();
    });
  } catch (err) {
    console.error('[push] initialize falló:', err);
  }
}

/* ─────────── identidad del usuario ─────────── */

async function putNotificationId(subscriptionId: string, idToken: string): Promise<void> {
  // ⚠️ El campo es `notificationID` con ID mayúscula: el DTO del backend usa
  // forbidNonWhitelisted, así que `notificationId` devuelve 400 y el token nunca
  // se guarda (bug histórico que dejó la cadena entera sin destinatarios).
  await fetch(`${API_URL}/user/update-notification-id`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ notificationID: subscriptionId }),
  });
}

/** Registra el subscription ID; si todavía no existe, espera el evento 'change'. */
function registerSubscription(idToken: string): void {
  const send = (id: string) => {
    putNotificationId(id, idToken).catch((err) =>
      console.error('[push] no se pudo registrar el token (no crítico):', err),
    );
  };

  OneSignal.User.pushSubscription
    .getIdAsync()
    .then((subId: string | null) => {
      if (subId) {
        send(subId);
        return;
      }
      // Todavía no hay ID (típico en el primer arranque, apenas se acepta el
      // permiso). En vez de abandonar hasta el próximo login, esperamos el evento.
      const onChange = (event: any) => {
        const id = event?.current?.id;
        if (!id) return;
        OneSignal.User.pushSubscription.removeEventListener?.('change', onChange);
        send(id);
      };
      OneSignal.User.pushSubscription.addEventListener?.('change', onChange);
    })
    .catch((err: unknown) => console.error('[push] getIdAsync falló:', err));
}

/**
 * Asocia el dispositivo al usuario logueado. Se llama en cada login y al
 * restaurar sesión.
 *
 * `OneSignal.login(uid)` setea el **external ID**: es lo que permite que el
 * backend, más adelante, apunte por usuario (`include_aliases`) en vez de por
 * subscription ID guardado en la DB — un usuario con dos dispositivos recibe en
 * ambos y una reinstalación no deja el registro viejo apuntando a la nada.
 * Hoy es aditivo: el backend sigue mandando por subscription ID.
 */
export async function identifyUser(uid: string, idToken: string): Promise<void> {
  if (!initialized) return;
  try {
    OneSignal.login(uid);
    await OneSignal.Notifications.requestPermission(true);
    OneSignal.User.pushSubscription.optIn?.();
    registerSubscription(idToken);
  } catch (err) {
    console.error('[push] identifyUser falló (no crítico):', err);
  }
}

/**
 * Desasocia el dispositivo al cerrar sesión: borra el `notificationId` guardado
 * en el backend (si no, el que se fue sigue recibiendo sus pushes en este
 * teléfono) y hace `OneSignal.logout()` para soltar el external ID.
 */
export async function clearIdentity(idToken: string | null): Promise<void> {
  try {
    if (idToken) {
      await fetch(`${API_URL}/user/notification-id`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => {});
    }
    if (initialized) OneSignal.logout();
  } catch (err) {
    console.error('[push] clearIdentity falló (no crítico):', err);
  }
}

/** Solo para tests: resetea el estado del módulo. */
export function __resetForTests(): void {
  navigationRef = null;
  navigationReady = false;
  pendingTarget = null;
  initialized = false;
}
