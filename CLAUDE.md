# Torna · App móvil (Expo / React Native / TypeScript)

Carpeta del producto. **iOS (principal) + Android**. Arranca con
`npm install && npm start`.

> Este documento es la fuente de verdad para Claude Code (o cualquier dev)
> que toque la app. Si una regla acá choca con lo que el código hace, gana
> este documento: el código está atrasado, no al revés.

---

## ⚡ Inicio rápido

```bash
cd expo
npm install
npm start            # Metro bundler
npm run ios          # build + simulador iOS
npm run android      # build + emulador Android
```

### Variables de entorno

```bash
# expo/.env (crear si no existe)
EXPO_PUBLIC_API_URL=https://api.torna.io        # URL base del backend
EXPO_PUBLIC_ONESIGNAL_APP_ID=<tu-app-id>        # App ID de OneSignal
```

Cambios al `.env` requieren reiniciar Metro con `npm start -- --clear`.

Arranca en **`LoginWithRoleScreen`** (`initialRouteName="LoginWithRole"` en
`App.tsx`). El usuario elige Player o Club desde el segmented control y va a
`MainPlayer` o `MainClub`.

---

## 🎯 Reglas de producto (no se negocian)

Torna es una app para **2 tipos de usuario**:

- **Player** — espectadores y jugadores. Pueden ver streams en vivo, seguir
  clubes/players, ver feed social (highlights), **reservar canchas** y
  **buscar partido** (partidos abiertos para sumarse).
- **Club** — admin de un club. Gestiona el perfil propio del club y ve los
  partidos / canchas / jugadores / reservas pendientes del club.

Login separa ambos roles (`LoginWithRoleScreen` con segmented control).
Players entran al instante; los clubes pasan por aprobación manual (<24 h)
con flujo `Register → Pending → MainClub`.

### ✅ Lo que la app SÍ hace

**Ambos roles:**
- Listar partidos: en vivo, programados, finalizados.
- Reproducir stream HLS con **swipe horizontal entre cámaras** (+ tabs como
  fallback). Cámaras tienen 2 estados: `available` ↔ `inactive`. La app
  **NO** las inicia/detiene/configura.
- Seguir/dejar de seguir clubes y players.
- Toggle Claro / Oscuro / Sistema persistido en `AsyncStorage` clave
  `@torna/theme-mode`.

**Solo Player:**
- Feed personal (`HomeScreen`) con 3 carouseles horizontales:
  - En vivo · de quienes seguís (tiles compactos 180px)
  - Próximos · de tus seguidos (tiles 220px con badge "Sigues a @x")
  - Highlights · de tus seguidos (tiles 200px con FeedPost: foto o clip)
- `ClubProfilePlayerView` — perfil público del club: highlights (live +
  clips), canchas grid 2×2 con CTA Reservar, próximos partidos públicos,
  members, fotos, info + mini-mapa.
- `PlayerProfilePublicView` — perfil público de otro player: avatar grande,
  badge "JUGANDO AHORA" si está en partido en vivo, momentos destacados
  (card LIVE como primera tile cuando aplica + clips), fotos.
- **Pestaña Juegos** (`GamesScreen` role=player) — **hub de partidos**, con dos
  secciones + acción **Reservar** (`CalendarPlus`) en el header:
  1. **Mis partidas** (`useMyGames`) → tap abre `UpcomingMatchSheet` (gestionar:
     cancelar/darme de baja/cancelar pareja).
  2. **Abiertos para sumarme** (GET /game/open vía `useOpenGames`) → cada card con
     hora/cancha/club, cupo (X/4), avatares, **"Ver detalle"** (abre
     `UpcomingMatchSheet` → **Postularme** vía `POST /game/:id/apply`) y **"Buscar en
     Maps"** (`MapsButton`). Estado vacío por sección. **La lista no usa GPS**: llega
     entera y se ordena por horario. El GPS solo decide **a quién se le avisa** de una
     partida abierta nueva (ver "Partidas abiertas cerca" abajo).

  > Antes esto vivía en `SearchPlayScreen` + una pestaña "Buscar" aparte (eliminadas).
  > El `UpcomingMatchSheet` se renderiza una sola vez en `MainPlayer` (estado
  > `myGameSheet`) y sirve ambos casos: gestión si `viewerIsParticipant`, postularse
  > si es un abierto. `JoinMatchScreen` es legacy y ya no existe.
- Flujo de reserva en **2 pasos** (`ReserveBlocks` → `ReserveStep3` →
  `ReserveSuccess`). **La partida nace de un bloque**, igual que en el desktop
  (ver "Reserva por bloques" más abajo):
  1. Día (chips horizontales) + **bloque libre**: una fila por horario del día
     (`06:00 – 07:30`) con cuántas canchas quedan libres; se despliega en las canchas
     de ese bloque (Disponible / Ocupada) y al elegir una aparece la duración
     (1–4 bloques consecutivos libres de esa cancha).
  2. **Switch "Buscar rivales"**:
     - OFF: el player + 1 compañero **obligatorio** + 2 rivales.
     - ON: el player + 1 compañero. El partido se publica para que 2 más
       se sumen.
     - **Cambiar** abre `PlayerSearchOverlay` (autofocus + filter local).
- Sumarse a un partido abierto: pestaña **Juegos** → sección "Abiertos" → "Ver detalle"
  → `UpcomingMatchSheet` → **Postularme** (`POST /game/:id/apply`, con switch "voy con
  compañero").
- **Reservar ahora, pagar en el club.** NO hay pago en la app.
- `PlayerOwnProfileScreen` — perfil propio del player: avatar, stats (seguidores / siguiendo / partidos / highlights), 3 tabs (Highlights / Partidos / Fotos), grid 3×N de contenido. Accesos a `MyLibraryScreen` y `PlayerSettingsScreen`.
- `MyLibraryScreen` — librería privada (solo el dueño la ve): 3 secciones colapsables (Mis partidos completos → acción "Crear highlight", Mis highlights con toggle Privado/Público, Mis subidas con foto/video ≤3 min). FAB "+" abre `UploadSheet`.
- `VideoEditorScreen` — flujo de 5 pasos para crear highlight desde una grabación de partido: Preview → Trim (`TrimRangeSlider`) → Metadata (título + visibilidad) → Procesando → Resultado. **El recorte es server-side**: la app llama `POST /highlights/from-recording` con `{ gameId, start, end, title, isPublic }` y el backend recorta (FFmpeg byte-range), sube el clip a B2 y crea el highlight. (Antes se recortaba on-device con `ffmpeg-kit`, que crasheaba la app.)
  - **Preview pre-subida (en `MetadataStep`)**: el paso de Detalles, justo antes de "Generar clip", muestra el clip **exacto que se va a subir** reproduciendo en loop solo el rango `start→end` con el `Player` (`startAt`/`endAt`, `muted`). Es 100% client-side (byte-range sobre `recordingUrl`, el mismo mecanismo de loop que usa `TrimStep`) — **no hay endpoint de preview**: el archivo final en B2 no existe hasta después de subir, así que se previsualiza la grabación de origen en el rango elegido. El `Player` acepta un prop `muted` (default `false`) para silenciar el preview inline.

**Solo Club:**
- `ClubHomeScreen` — admin home: 3 stat cards (live, viewers, a cobrar) +
  carousel de partidos en vivo del club + lista de reservas del día con
  badge A COBRAR / PAGADA.
- `CourtsScreen` — canchas del club, **solo lectura** (no CRUD).
- `PlayersScreen` — directorio de seguidores.
- `ProfileScreen` — editar perfil + cambio de contraseña con checklist.

### ❌ Lo que la app NO hace (admin panel externo)

- NO crea/edita/elimina canchas.
- NO inicia/detiene/configura cámaras (NO BLE).
- NO procesa pagos.
- NO modera jugadores.

Si alguien pide algo que pisa estas líneas, rechazar y pedir confirmación.

---

## 📦 Modelo de datos

Tipos exportados desde `data/types.ts` (antes `mocks.ts`). **La app ya NO usa
mocks de datos**: consume la API real mediante clientes (`api/*`) y hooks
(`hooks/use*`). Donde todavía no hay endpoint, la pantalla muestra **estado
vacío** — nunca datos falsos.

```ts
// Auth
TornaUser { id, email, username, name?, phone?, region?,
            isClub: boolean,
            authProvider: 'email' | 'google' | 'apple' }

// Club
ClubPublic {
  id, name, handle, city,
  followers, isFollowing,
  hours, phone, address,
  highlights: { live: LivePreview[], clips: ClipPreview[] },
  courts: ClubCourtPublic[],
  upcoming: UpcomingPublicGame[],
  members: DirectoryPlayer[],
  photos: number[]   // → URLs en prod
}

ClubCourtPublic { id, name, surface, cams, indoor, nextSlot }

// Reservation
Slot { start, end, duration: number, price, status: 'free'|'reserved'|'own', cams }
InvitablePlayer { id, name, username, rating }
Reservation {
  id, courtId, date, slotStart,
  bookerUserId, partnerUserId,                       // obligatorio
  mode: 'full' | 'search-opponents',
  opponents?: [UserId, UserId],
  payment: { method: 'at-club', amount, status: 'pending' },
  status: 'confirmed' | 'cancelled' | 'completed'
}

// Player public
PlayerPublic {
  id, name, username, club, location,
  followers, isFollowing,
  isLiveNow, liveGame: PlayerLiveGame | null,
  clips: PlayerClip[],
  photos: number[]
}

// Search play — legacy (ya NO se usan: SearchPlay ahora lista GET /game/open).
// NearbyClub se mantiene por si vuelve la búsqueda por cercanía; el resto es histórico.
NearbyCourt  { id, name, club, distanceKm, surface, freeSlots[], hasCameras }
NearbyPlayer { id, name, username, rating, distanceKm, lookingFor, availability }

// Feed social
FeedPost {
  id, type: 'photo' | 'highlight',
  author: { name, username, role: 'player' | 'club' },
  contextLine?, duration?,                            // duration solo highlights
  caption?, postedAt, likes, comments,
  tone?: 'lime' | 'blue' | 'white',                   // placeholder visual
  mediaAspectRatio?: string                            // '1 / 1' default
}

// Game detail
GameDetailData {
  id, court, floor, club, clubHandle, clubFollowers,
  time, date, viewers, isLive,
  players: MatchParticipant[],
  cameras: CameraAngleData[]
}
CameraAngleData { id, number, label, state: 'available' | 'inactive' }

// Player — perfil propio (POV dueño)
ProfileOwner {
  id, name, username, location,
  followers, following,
  matchesPlayed, highlightsCount, photosCount
}

// Librería del player
LibraryMatch    { id, date, court, club, duration, hasHighlights }
LibraryHighlight { id, matchId?, title, visibility: 'public'|'private',
                   durationLabel, createdAt }
LibraryUpload   { id, kind: 'photo'|'video', title, visibility: 'public'|'private',
                  createdAt }

// Club admin — reservas del día
ClubTodayReservation {
  id, courtName, slotStart, slotEnd, playerName,
  payment: { status: 'pending'|'paid', amount }
}
```

### Espectadores conectados (`useViewerPing`, 2026-09-01)

El contador vive **solo en el visor** (`GameDetailScreen`) y solo con la partida **EN
VIVO**. Sale de un latido cada 30 s contra `POST /game/:id/viewer-ping`, que guarda la
presencia en Redis y **devuelve el conteo en la misma respuesta** — mostrarlo no cuesta un
request extra.

- **Cuenta personas, no conexiones**: el backend usa el UID como miembro del sorted set,
  así que la misma cuenta en dos dispositivos cuenta 1.
- `useViewerPing(gameId, enabled)` late con la pantalla **enfocada** y la app en **primer
  plano**, y late **al montar** (si no, entrar y salir a los 20 s no contaría nunca). Al
  cerrar la app dejás de latir y salís del conteo solo a los 90 s.
- ⚠️ `PING_MS` (30 s) está atado a la ventana del backend (`PresenceService.WINDOW_MS`,
  90 s = 3×). Si lo subís acá sin subirla allá, la gente se cae del conteo entre latidos.
- **`viewers === null` = no se puede saber** (sin Redis o Redis caído) → no se muestra
  nada. Nunca un `0`: un cero inventado es exactamente el problema que había antes.
- **`MIN_VIEWERS_TO_SHOW = 3`** (exportado de `GameDetailScreen`): por debajo del umbral
  el badge no aparece. "1 espectador" comunica peor que no decir nada. Bajarlo a 1 es
  cambiar ese número y nada más.

#### De dónde viene esto (por qué NO está en las otras 8 superficies)

Hasta el 2026-09-01 la app mostraba "N espectadores" en nueve lugares y **el número no
existía**: el backend no tenía columna de viewers, así que cada mapper lo seteaba a `0` a
mano y la UI lo pintaba igual. El home de club era peor: renderizaba un `DEFAULT_STATS`
inventado (65 espectadores, +18 vs ayer, 2 en vivo de 8 canchas, 3 a cobrar) porque
`App.tsx` nunca le pasó `stats`.

Se sacó de todas y del tipo; después volvió **solo al visor**, con dato real detrás. No lo
repongas en cards, reel ni perfiles: ahí no hay latido y volvería a ser un cero.

⚠️ **`GameWatch` no es esto.** `watchGame`/`unwatchGame` es "avisame de este partido" y
alimenta las notificaciones: gente **interesada**, no **conectada**.

⚠️ **El contador de Wowza tampoco sirve.** El panel expone `connections` en
`POST /controller/MediaService/serviceInfo/<id>`, pero cuenta **conexiones HTTP**: medido el
2026-09-01, seis clientes marcaban **76**, con un piso de 2-4 sin nadie mirando. Además la
auth es una cookie de sesión de navegador, no una API key.

**Reglas de negocio que el frontend respeta:**

1. Partner es **siempre obligatorio** en reservas — debe existir en la app.
2. La reserva se crea con `POST /game/reserve` (una `Game` SCHEDULED sin cámaras).
   `mode='search-opponents'` marca `isOpenForPlayers=true` para que otros 2 se sumen.
3. El precio (`slot.price`) sale del `pricePerBlock` de la cancha; se muestra pero NO se
   cobra (pago en el club). Total = precio × bloques.
4. Slots `reserved` están bloqueados (solapan una Game existente de esa cancha).
   Los slots ya no son fijos: el backend los genera del horario configurable de la cancha
   (semanal + excepciones por fecha); cancha inactiva o día cerrado → sin slots.
5. **Multibloque**: `ReserveBlocksScreen` permite 1–4 bloques consecutivos libres **de la
   misma cancha** → `durationMinutes = block × N` (el móvil arma un "slot combinado"; el
   back valida múltiplo/tope). Canchas inactivas no entran a la grilla (no tienen slots).
6. **El GPS no filtra ninguna lista.** La sección "Abiertos" de la pestaña Juegos sigue
   sin pedir permiso: lista todo (GET /game/open) y la ubicación de cada partida se abre
   en Google Maps fuera de la app (`MapsButton`). Lo único que usa GPS es **a quién se le
   notifica** una partida abierta nueva (ver abajo).
7. **Dos ubicaciones distintas, dos reglas distintas.**
   - `User.latitude/longitude` = dirección **fija y pública** del club (`isClub=true`).
     Es la que alimenta el mini-mapa y `MapsButton`.
   - `User.lastLat/lastLng` = última posición **aproximada y privada** del jugador. No se
     muestra en ninguna pantalla, no viaja en ningún perfil y el backend no tiene ningún
     endpoint que la devuelva. Ver "Partidas abiertas cerca".

---

## 🔌 API real (lo que la app consume)

Endpoints reales que la app llama hoy (vía `api/*` y `hooks/use*`). El backend
envuelve toda respuesta en `{ data, statusCode }`; los clientes desenvuelven `data`.
Las features sin endpoint todavía muestran **estado vacío** (no mocks).

### Auth

```
POST /auth/login-email-password  { email, password } → { token, user: TornaUser }
POST /auth/login                 { idToken: string } → { token, user: TornaUser }
                                                      | { status: 'needs_registration', idToken }
POST /auth/register              { idToken, username, name, authProvider } → { token, user: TornaUser }
GET  /auth/me                    Bearer token → TornaUser
DELETE /auth/logout              → 204
```

#### Alta de cuenta (registro)

Toda alta termina en `POST /auth/register`, que **exige un `idToken` de Firebase**
(no existe un registro server-side por email). El backend setea `status` según el
rol: **player → `status:true` (entra al instante)**, **club → `status:false`
(pendiente de aprobación manual)**. Tres caminos según cómo se obtiene el `idToken`:

```
Email/contraseña (solo Player) — RegisterPlayerScreen
  Firebase createUserWithEmailAndPassword(email, pass)  → idToken
  → AuthContext.registerWithEmailPassword(email, pass, { username, name, isClub:false })
  → POST /auth/register { authProvider:'email', isClub:false }
  → user seteado → Root cambia al AppStack (sin pasar por Pending)

Social (Google/Apple) — LoginWithRoleScreen → CompleteProfileScreen
  firebaseAuth().signInWithCredential(...)              → idToken
  → POST /auth/login → { exists:false } → CompleteProfileScreen (elegir username)
  → AuthContext.register(idToken, { authProvider:'google'|'apple' })

Club por email — RegisterClubScreen
  ⚠️ HOY ES UN MOCK: su onSubmit solo hace navigation.replace('Pending'); NO crea la
  cuenta en Firebase ni llama a la API. Para cablearlo de verdad: usar el mismo
  registerWithEmailPassword con isClub:true (el backend ya lo deja en status:false).
```

> ⚠️ **`GET /auth/check-username` viene envuelto en `{ data, statusCode }`** como todo el
> backend. Leer `json.available` del JSON crudo da `undefined` → se interpreta como
> "ocupado" → **todos** los usernames salen tomados y el botón de registrarse nunca se
> habilita (bug real que impedía crear cuentas). Usar siempre
> `checkUsernameAvailable()` de `api/auth.ts`, que desenvuelve `data`. Formato válido:
> `^[a-zA-Z0-9_]+$`, 3–30 chars (`USERNAME_RE`, espejo del `@Matches` del backend).
>
> ⚠️ **`POST /auth/login-email-password` responde 200 con `{ exists:false, firebaseUser }`**
> cuando las credenciales son válidas en Firebase pero el usuario **no tiene fila en la DB**
> (típico de cuentas creadas a mano desde la consola de Firebase). No es un error de
> credenciales ni de roles. `loginWithEmailPassword` devuelve `needs_registration` y la UI
> manda a `CompleteProfile` con `authProvider:'email'`, igual que el login social. Antes se
> destructuraba `user` sin chequear y reventaba con "cannot read property 'id' of undefined".

> El botón **"Crear cuenta de Player"** de `LoginWithRoleScreen` navega a
> `RegisterPlayer` (`App.tsx`); el de club va a `Register`. El username se valida
> en vivo contra `GET /auth/check-username?username=` (debounce 400 ms).

#### Recuperar contraseña (usuario deslogueado)

`ForgotPasswordScreen` (ruta `ForgotPassword` del AuthStack) → `AuthContext.sendPasswordReset(email)`
→ `firebaseAuth().sendPasswordResetEmail(email)`. **El backend no participa**: su
`POST /auth/reset-password` está detrás de `FirebaseAuthGuard` y exige sesión activa, o sea
que no sirve para alguien que olvidó la clave (es un *cambio*, no una *recuperación*).

- Se entra desde "Olvidé mi contraseña" en `LoginWithRoleScreen`, que pasa el email ya
  tipeado como `prefillEmail`.
- ⚠️ **No se revela si el email existe**: `user-not-found` muestra exactamente la misma
  pantalla de confirmación que el caso feliz. Solo se muestran errores de formato,
  rate-limit y red. Cubierto por `screens/__tests__/ForgotPasswordScreen.test.tsx`.
- Cuentas Google/Apple: no tienen contraseña, pero el mismo enlace de Firebase les permite
  crear una — el copy de la confirmación lo aclara.

#### Cambio de contraseña (player + club)

Se hace **client-side contra Firebase**, NO vía el backend. `AuthContext.changePassword`:

```
1. firebaseAuth().signInWithEmailAndPassword(email, currentPassword)  → valida la
   clave actual Y crea sesión en el SDK cliente (necesaria: los que entraron por
   email/password lo hicieron vía backend, así que currentUser estaba null)
2. currentUser.updatePassword(newPassword)   → actualiza directamente en Firebase
3. getIdToken(true) + SecureStore.setItemAsync(TOKEN_KEY, fresh)  → refresca sesión
```

- **Player**: `PlayerSettingsScreen` → sección `password`.
- **Club**: `ProfileScreen` → pestaña Seguridad.
- Ambas usan `useAuth().changePassword` directo (con loading/error inline + `Alert` de
  éxito) y el helper `friendlyPasswordError` (exportado desde `PlayerSettingsScreen`).
- ⚠️ El backend `POST /auth/reset-password` existe pero la app **no lo usa** (no
  verifica la contraseña actual; el camino cliente sí, vía el re-login del paso 1).
- Cuentas Google/Apple no tienen contraseña: el paso 1 falla y se muestra un mensaje
  claro ("entraste con Google/Apple").

### Feed / Inicio (player)

> ⚠️ El backend NO tiene módulo `/feed`. El inicio se arma con endpoints de
> `/game`, `/highlights` y `/follow`. La columna izquierda es lo que la app
> debe llamar realmente:

```
GET  /game/live                  → LiveGame[]   partidas LIVE de seguidos (clubs/players)
                                                 stream HLS en cameras[].camera.streamingUrl
GET  /game/:userId/upcoming      → Game[]        próximas partidas del usuario
GET  /highlights?cursor=…        → highlights (feed de momentos destacados)
POST /highlights/:id/like        → like/unlike de un highlight
POST /highlights/:id/comments    { text } → Comment
```

`HomeScreen` consume `GET /game/live` vía `hooks/useLiveGames.ts` (mapea →
`LiveGameData`). Si la lista real viene vacía, muestra su **estado vacío** —
ya no hay fallback a mocks.

### Usuarios — `api/users.ts`

```
GET /user/profile/:id   → perfil público + followersCount/followingCount/isFollowing + lat/lng
                          (useUserProfile → PlayerProfilePublicView; también arma ClubPublic)
GET /user/search-all?q= → jugadores + clubs (GlobalSearchScreen; solo usuarios, NO canchas)
GET /user/search?q=     → jugadores (overlay de invitar en la reserva)
GET /user/players       → directorio de jugadores (usePlayers → PlayersScreen)
GET /highlights?userId= → highlights PÚBLICOS de un usuario (useUserProfile → carrusel del perfil, desc)
GET /highlights/my      → TODOS mis highlights, públicos + privados (useMyHighlights → perfil propio + librería)
POST /highlights        { …, isPublic } → crea highlight con visibilidad (editor)
PATCH /highlights/:id/toggle → invierte público/privado (pill de MyLibraryScreen). Sin body
                               (el backend lee el estado actual de `isEnabled` y lo flippea);
                               owner-only (no-dueño → 403)
```

> **Visibilidad de highlights**: públicos aparecen en el perfil (más reciente→más antiguo);
> privados solo en `MyLibraryScreen`. En el backend la visibilidad se guarda en `isEnabled`.
>
> **Cómo se cablea el toggle** (sección "Mis highlights" de `MyLibraryScreen`): tap en el
> chip `VisibilityPill` → `onToggleVisibility(item)` → `App.tsx` `toggleVisibility`:
> hace un **flip optimista** del `isPublic` local y persiste con `toggleHighlightVisibility`
> (`api/highlights.ts` → `PATCH /highlights/:id/toggle`); si la request falla, **revierte**.
> El estado inicial viene de `useMyHighlights`, que mapea `isEnabled`→`isPublic`.
> ⚠️ El chip de **partidos** (matches) en la misma pantalla es **cosmético/local**: los
> partidos no tienen visibilidad en el backend (no hay endpoint). Cubierto por tests:
> `torna-api/src/highlights/highlights.service.spec.ts` (`HighlightsService.toggle`).

### Club admin (home)

> No existen `/clubs/:id/dashboard` ni `/today`. `ClubHomeScreen` usa **estado vacío** por ahora.

### Club público (POV player) — `App.tsx` ruta `ClubProfile`

```
GET    /club/:id            → club  (los clubs son users isClub=true)
GET    /club/nearby?lat=&lng=&radius= → clubes cercanos (existe en el backend; la app
                                        ya NO lo consume tras quitar el GPS de SearchPlay)
POST   /follow             { userId } → seguir
POST   /follow/unfollow    { userId } → dejar de seguir
```

### Player público — `hooks/useUserProfile.ts`

```
GET   /user/profile/:id        → PlayerPublic (identidad + conteos + isFollowing + notifyOnMatch)
GET   /highlights?userId=       → clips del jugador (incluye thumbnailUrl + description)
GET   /follow/followers/:id     → seguidores (FollowListSheet)
GET   /follow/following/:id     → seguidos (FollowListSheet)
POST  /follow | /follow/unfollow  { userId } → seguir / dejar de seguir (followUser/unfollowUser en api/users.ts)
PATCH /follow/notify/:userId    { notify }   → toggle "Notificarme" (setFollowNotify, persiste Follower.notifyOnMatch)
```

> El toggle de campana del perfil ajeno (`onToggleNotify`) persiste vía
> `PATCH /follow/notify/:userId` y se rehidrata desde `notifyOnMatch` del perfil. Las
> listas de seguidores/seguidos son clickeables → navegan a `PlayerProfile` (recursivo).
>
> **Seguir/dejar de seguir** (players y clubs, misma tabla `Follower` — un club es un
> `User` con `isClub=true`): clientes únicos `followUser`/`unfollowUser` (`api/users.ts`)
> usados por `PlayerProfilePublicView`, `ClubProfilePlayerView` y el botón del club en
> `GameDetailScreen` (via `clubId` que trae `useGameDetail`). Update optimista + revert.
> **Conteos de seguidores/seguidos siempre frescos**: `MainPlayer` re-fetchea el perfil
> propio (`refreshOwnProfile`) al recuperar el foco y al abrir el tab Perfil, así el
> contador se actualiza tras seguir/dejar de seguir desde otra pantalla.
>
> ⚠️ **Seguir a un club usa EXACTAMENTE el mismo mecanismo que seguir a un player.** Como
> un club es un `User`, la ruta `ClubProfile` (`App.tsx`) es un `ClubProfileScreen` que
> **refleja `PlayerProfileScreen`**: `useUserProfile(clubId)` + estado local `overrides` +
> `view = { ...fetched, ...overrides }`, montado con **`key={clubId}`** (montaje fresco por
> club). `onToggleFollow` hace el flip optimista sobre `overrides` + `followUser/unfollowUser`
> + revert en `.catch` — idéntico al player. **Una sola fuente de verdad**: no metas un
> segundo estado de follow (un intento previo con un hook aparte + un `sync` que corría en el
> `.then` del fetch pisaba el cambio optimista → el botón revertía aunque el `POST /follow`
> devolviera 201). Lo único propio del club: la presentación (`ClubProfilePlayerView`: anillo
> verde + etiqueta "CLUB") y las **canchas** (se cargan aparte con `fetchClubCourts`, porque
> `useUserProfile` no las trae) para la sección "Canchas y horarios" → Reservar.

### Highlights — comentarios, threads, descripción y miniatura

- **Comentar / responder en thread**: `VideoPreviewModal` (con `showComments` + `highlightId`)
  trae `GET /highlights/:id` (comments + likesCount + isLikedByMe + description). Comentar:
  `POST /highlights/:id/comments { content, parentId? }` — `parentId` seteado = respuesta
  (thread). El modal agrupa por `parentId` (raíz + respuestas indentadas), con botón
  "Responder" y chip "Respondiendo a…".
- **Descripción**: se agrega al crear (editor `MetadataStep` → `createHighlightFromRecording`
  con `description`) y se edita en `MyLibraryScreen` ("Editar/Agregar descripción" → modal →
  `updateHighlightMeta` → `PATCH /highlights/:id { title?, description? }`, owner-only). Se
  muestra en el modal bajo el video.
- **Miniatura (poster)**: el backend genera `thumbnailUrl` (B2) al recortar. `ContentThumb`
  la renderiza con `imageUri` (grid del perfil propio, `MyLibraryScreen`, carrusel del perfil
  público); cae al placeholder SVG si falta. Tap → abre el video completo.
- **Pantalla completa in-app**: el botón `Maximize2` de `VideoPreviewModal` expande el video
  (estado `expanded`, NO el nativo del OS) para poder superponer un panel de comentarios
  (`showCommentsPanel`) con botón flotante "Comentarios (N)".
- ⚠️ **Todos los caminos que abren un highlight deben pasar `highlightId` + `showComments`**
  al `VideoPreviewModal` (perfil propio/librería abren via `openPreview`→`previewVideo`; el
  perfil ajeno via `clipModal`). Sin `highlightId` no hay descripción ni comentarios.

### Canchas y reservas — `api/clubs.ts`

```
GET  /padel-court?clubId=            → canchas del club (trae isActive/blockMinutes/
                                       pricePerBlock/cameras). Solo las activas entran
                                       a la grilla de bloques
GET  /padel-court/:id                → una cancha (`fetchCourt`; sin uso en pantalla hoy)
GET  /padel-court/:id/slots?date=    → Slot[] del día de UNA cancha. La grilla sale del
                                       horario configurable de la cancha (semanal +
                                       excepción de la fecha); [] si inactiva/día cerrado
POST /game/reserve  { courtId, date, slotStart, durationMinutes, mode,
                      partnerUserId?, opponentUserIds? } → crea la partida (ReserveStep3).
                      durationMinutes = block × N (1–4 bloques, multibloque)
```

#### Reserva por bloques (espejo del desktop, 2026-08-26)

La reserva **arranca por el bloque, no por la cancha** — el mismo modelo que Inicio del
desktop (`BloquesDisponibles`), donde "crear partida" nace de un bloque libre.

- `ReserveBlocksContainer` (`App.tsx`) trae las canchas **activas** del club y dispara
  `GET /padel-court/:id/slots?date=` **una vez por cancha** (`Promise.all`, igual que el
  desktop). Un `loadToken` (ref) descarta la respuesta vieja si el usuario cambia de día
  antes de que llegue.
- `groupSlotsIntoBlocks` (`lib/reservation.ts`) agrupa esos slots por `{start,end}` →
  una fila por horario con la disponibilidad de cada cancha. Es el espejo de
  `agruparPorBloque` del desktop, y guarda el **índice del slot dentro de la grilla de su
  cancha**: sin eso no se puede calcular el multibloque (que es por cancha, no por bloque).
- ⚠️ **Dos canchas con `blockMinutes` distinto NO comparten fila** (se agrupa por
  `{start,end}` exacto) — mismo comportamiento/limitación que el desktop.
- **Bloques pasados (2026-08-29)**: el backend ya **no devuelve** los bloques que ya
  terminaron, pero **sí** devuelve el bloque **en curso**, con `Slot.started = true`
  (lo necesita el desktop, que crea la partida del momento desde el bloque actual).
  Para la app ese bloque **no es reservable** — `POST /game/reserve` exige horario
  futuro —, así que se usa el helper **`isBookable(slot)`** (`= status==='free' &&
  !started`) en vez de mirar `status` a secas: la fila se muestra como "En curso" y no
  se puede elegir, y `blockAvailability` no la cuenta como libre. ⚠️ Si agregás una
  pantalla que ofrezca slots, usá `isBookable`, no `status === 'free'`, o vas a ofrecer
  un bloque que el backend rechaza con 400.
- Cubierto por `lib/reservation.test.ts` (agrupado + disponibilidad + bloque en curso,
  con la grilla real de casapadel) y `screens/__tests__/ReserveBlocksScreen.test.tsx`
  (UI: bloques, cancha ocupada no elegible, bloque en curso no elegible, slot combinado
  al continuar).

### Partidas: postular / mis partidas / bajas — `api/games.ts`

```
GET   /game/open                              → partidas abiertas (useOpenGames → Home)
GET   /game/mine                              → mis partidas activas (useMyGames → GamesScreen "Mis partidas")
POST  /game/:id/apply { partnerId? }          → postularme (ApplyMatchSheet)
PATCH /game/:id/applications/:appId/accept    → aceptar postulación (owner; UpcomingMatchSheet)
PATCH /game/:id/applications/:appId/reject    → rechazar postulación (owner)
PATCH /game/:id/cancel                        → owner cancela toda la partida (→ CANCELLED)
POST  /game/:id/leave                         → miembro no-owner se da de baja
POST  /game/:id/cancel-pair                   → la pareja retadora (team=2) se baja
```

### Cercanía (`api/nearby.ts`)

```
GET    /nearby/settings                       → { enabled, hasLocation, updatedAt, radiusKm }
PUT    /nearby/settings   { enabled }         → toggle (apagarlo BORRA la posición)
PUT    /nearby/location   { latitude, longitude } → reportar posición (el back la redondea)
DELETE /nearby/location                       → olvidarla (logout)
```

> ⚠️ Prefijo `/nearby` y no `/user/...`: el `UserController` del backend termina en
> `@Get(':id')` y Nest matchea por orden, así que un `GET /user/nearby-algo` lo resolvería
> esa ruta y devolvería "usuario no encontrado".
>
> ⚠️ **No hay ningún endpoint que devuelva la ubicación de otro usuario**, y no se debe
> agregar: todo `/nearby` es sobre uno mismo (el UID sale del token).

### Direcciones y ubicación del club — `api/geo.ts` · `api/club.ts`

```
GET /geo/status                                  → { configured }
GET /geo/autocomplete?text=&latitude=&longitude= → AddressSuggestion[]
GET /geo/reverse?latitude=&longitude=            → AddressSuggestion | null

GET /club/location                               → { latitude, longitude, address, hasLocation }
PUT /club/location  { latitude, longitude, address? }
```

> ⚠️ **La clave de Geoapify NO viaja en la app.** El backend hace la llamada al proveedor;
> una clave dentro del APK la extrae cualquiera con un descompresor y regala la cuota. Si ves
> un `EXPO_PUBLIC_GEOAPIFY_*` en un PR, está mal.
>
> ⚠️ `/geo` solo traduce entre texto y coordenadas, para **ubicar un club**. La cercanía de
> las partidas la calcula el backend con un haversine en SQL y no llama a ningún tercero.

#### Partidas abiertas cerca — el GPS (2026-09-01)

El flujo de "buscar rivales" tenía un agujero: una partida abierta solo la veía quien
entraba a la pestaña Juegos por su cuenta, y justo ese día. El GPS lo cierra **por el lado
del aviso, no por el de la búsqueda**.

```
reserva con mode='search-opponents'  →  backend busca jugadores con el aviso activo
                                        a ≤25 km del CLUB de la cancha
                                     →  push + campanita OPEN_GAME_NEARBY → GameDetail
```

- **Opt-in explícito**, apagado por defecto. Dos lugares donde se enciende, y en los dos el
  permiso del sistema se pide **en contexto** (iOS da un solo prompt por instalación; pedirlo
  en el login lo quema frente a alguien que todavía no sabe qué es la app):
  - **`NearbyPromptCard`** en la pestaña **Juegos**, sobre "Abiertos para sumarme". Es el
    ofrecimiento real: sin él la función vive solo en Ajustes y **nadie va a Ajustes a buscar
    algo que no sabe que existe**. Se muestra solo si el aviso está apagado *y* nunca se
    descartó (`shouldPrompt`); descartarlo es **definitivo** (`AsyncStorage`, clave
    `@torna/nearby-prompt-dismissed`) — insistir con algo ya rechazado es cómo una app se gana
    que la silencien.
  - **`PlayerSettingsScreen`** → sección "Partidas cerca", para quien cambie de idea después.
  Apagarlo **borra** la posición del servidor.
- ⚠️ **Nada pide el permiso al iniciar sesión, y es a propósito.** Si alguien reporta "hice
  login y no me pidió la ubicación", eso es el comportamiento correcto: el único que abre el
  diálogo del sistema es `enable()`, o sea la tarjeta o el toggle.
- ⚠️ **El aviso de "sin permiso" NO se puede condicionar a que el toggle esté encendido.**
  Cuando el permiso se niega, `enable()` sale **sin** activar el flag, así que
  `settings.enabled` queda en `false`. Un `{on && problem === 'denied'}` no se cumple nunca:
  el switch vuelve solo, sin una palabra, y como el sistema ya no vuelve a preguntar el
  usuario queda **sin ninguna salida**. El mensaje con `Linking.openSettings()` se muestra
  con `problem === 'denied'` a secas — es el único camino de vuelta.
- ⚠️ **Contraste: `accentSoft` y `accentText` no son intercambiables.** `accentSoft` es lima
  al **18 %** (fondo, nunca texto) y `accentText` es lima **sólida en tema oscuro**. Pintar
  copy con `accentText` sobre `accentSoft` deja lima sobre lima y no se lee; usar
  `accentSoft` como color de texto lo hace invisible. Los pares seguros son texto sobre
  `bg2`/`surface`, o `colors.ink` sobre lima sólida — que es lo que ya da
  `<Button variant="accent"/>`. Por eso `NearbyPromptCard` usa el `Button` del design system
  en vez de un `Pressable` a mano. Cubierto por `components/__tests__/NearbyPromptCard.test.tsx`,
  que falla si algún texto de la tarjeta usa un color translúcido o lima.
- **`hooks/useNearbyLocation.ts`** es a la vez el latido y el toggle. El latido vive en
  `MainPlayer` (`useNearbyLocation(!!user?.id)`), reporta al montar y al volver del segundo
  plano, con un piso de 15 min entre escrituras.
- **`lib/location.ts`** nunca lanza: todo devuelve `null` o un motivo. Precisión
  `Balanced` (~100 m), no `High` — el backend redondea a 110 m, así que pedir metros
  gastaría batería para producir dígitos que se descartan.
- ⚠️ **El latido NO pide permiso.** Usa `currentPosition`, que devuelve `denied` si no está
  concedido; el único que pregunta es `requestPositionOnce`, o sea el toggle. Si los
  intercambiás, la app abre el diálogo del sistema sola al volver del segundo plano.
- ⚠️ **No hay `watchPositionAsync` y no debe haberlo.** Seguir la posición en continuo es
  lo que la gente entiende por "app que me rastrea", gasta batería y no cambiaría ni un
  resultado: la pregunta que alimenta es "¿estás a menos de 25 km de esta cancha?", y eso
  no se mueve entre dos aperturas de la app.
- ⚠️ **La ubicación del jugador no se muestra en ninguna parte.** No está en ningún perfil,
  ninguna card ni ningún mapa, y el backend no expone ningún endpoint que devuelva la
  posición de otro. Si aparece un diseño con "jugadores a X km", eso es una feature nueva
  con otra discusión de privacidad, no un detalle de esta.
- El logout la borra (`forgetLocationOnLogout`, llamado desde `AuthContext.logout`), igual
  que el `notificationId`.
- Cubierto por `hooks/__tests__/useNearbyLocation.test.ts`.

#### Ubicación del club (rol club) — `ClubLocationSheet` (2026-09-02)

Se abre una vez desde `MainClub` si el club no tiene coordenadas. Espejo exacto del
`ClubLocationDialog` del desktop: los dos resuelven `GET/PUT /club/location` + `/geo/*`,
porque el admin puede entrar por cualquiera de los dos y el dato tiene que quedar igual.

- **Sin coordenadas, las partidas abiertas del club no avisan a nadie** (el fan-out se ancla
  en la cancha). Ese es todo el motivo de esta pantalla.
- Dos caminos: **"Usar mi ubicación actual"** (`precisePosition`, no depende de Geoapify) y
  **buscar la dirección** (solo si `GET /geo/status` dice `configured`).
- ⚠️ **`precisePosition` ≠ `currentPosition`.** La primera pide `Accuracy.High` y **no** usa
  la última posición conocida: acá los metros importan porque la coordenada se guarda exacta
  y termina en un pin de Maps. La segunda (la del aviso de cercanía) prioriza la última
  conocida, que es lo que la hace barata. No las intercambies.
- Se puede posponer; vuelve a preguntar en el próximo arranque.

#### Aceptar o rechazar postulantes

La lista vive en `UpcomingMatchSheet` → sección **"Postulados"**, y **solo la ve el
organizador** (`game.isCreator`).

- Cada postulante —y el compañero, si se postuló en pareja— es **tocable y abre su perfil**
  (`onOpenPlayerProfile`), y muestra su **nivel** (`CategoryBadge`). Decidir a quién metés
  en tu partida mirando un nombre y un avatar de 36px no es decidir; por eso
  `getGameApplications`/`getMyGames` traen `applicant.id` y `applicant.category`.
- Aceptar/rechazar es **optimista con revert** contra `PATCH /game/:id/applications/:appId/…`.
- El postulante se entera: el backend emite `GAME_APPLICATION_ACCEPTED` (→ `GameDetail`) o
  `GAME_APPLICATION_REJECTED` (→ hub de partidos). Antes postularse era un pozo — el
  capitán decidía y del otro lado no llegaba nada.
- Cubierto por `components/__tests__/UpcomingMatchSheet.test.tsx`.

> **Equipos**: cada `GamePlayer` trae `team` (1 = lado owner, 2 = pareja retadora). El tab
> **Juegos** del player muestra "Mis partidas" (`useMyGames`); tocar una abre `UpcomingMatchSheet`
> que, según el rol del viewer, ofrece *Cancelar partida* (owner), *Darme de baja* (miembro) y
> *Cancelar nuestra pareja* (team 2). Las bajas/cancelaciones notifican por push (OneSignal).

#### Host (organizador) y categoría

- **Host** = `GamePlayer.isCaptain` del backend (quien creó la partida). Ya viaja en
  `/game/mine`, `/game/open` y `/game/:id`; la app lo mapea a **`UpcomingGamePlayer.isHost`** /
  `MatchParticipant.isHost` y lo pinta con **`<HostBadge/>`** (`components/ui.tsx`) en
  `UpcomingMatchSheet`, las cards de `GamesScreen` y `GameDetailScreen`.
  ⚠️ No confundir con `isCreator` de `UpcomingGameData`, que es "¿el host soy **yo**?" y es lo
  que habilita las acciones de owner. Los dos conviven: `isCreator` para permisos, `isHost`
  para mostrar **quién** organiza.
- **Nivel (categoría)** = `Game.category` / `User.category`, **1 = más alta, 7 = iniciación**
  (convención de pádel). Es **el** dato que categoriza una partida: desde el 2026-08-30
  reemplazó a la superficie de la cancha, que se eliminó de toda la app (ver abajo).
  - **Obligatorio al agendar, en los dos clientes**: en la app, `ReserveStep3Screen` no
    habilita "Confirmar reserva" hasta elegir un chip 1–7 (ya no se puede deseleccionar);
    en el desktop, `CreateGameDialog` tiene un select requerido y no deja crear sin él.
  - ⚠️ En el **backend sigue siendo opcional** a propósito, en `ReserveGameDto` y en
    `CreateGameDto`: con `forbidNonWhitelisted`, un campo de más da 400 y uno de menos no,
    así que exigirlo rompería a una versión vieja del desktop todavía instalada. La regla
    se defiende en las UIs; el `@Min(1) @Max(7)` sí lo valida cuando llega.
  - También se elige en el perfil propio (`PlayerSettingsScreen` → Editar perfil →
    `updateMyCategory` → `PATCH /user/me`, optimista con revert).
  - Se muestra con **`<CategoryBadge category/>`**, que devuelve `null` si no hay nivel — el
    llamador no condiciona el render. Excepción: en `PlayerProfilePublicView` va como texto,
    porque ahí el fondo es el azul del hero y el badge usa `colors.text`.
  - Cubierto por `components/__tests__/UpcomingMatchSheet.test.tsx` y
    `screens/__tests__/GameDetailScreen.test.tsx`.
- ⛔ **La superficie de la cancha (CLAY/GRASS/HARD/CARPET) ya no existe en la app.** Se
  borraron `SurfaceChip`, el tipo `LibrarySurface`, `normalizeSurface` y el campo `surface`
  de `ClubCourtPublic`/`SearchableCourt`/`LibraryMatch`/`CourtData`, y `GameDetailData.floor`
  pasó a ser `category`. **El backend la sigue teniendo** (`PadelCourt.surface` es una columna
  real y el desktop la edita): simplemente no se mapea ni se muestra. No la repongas en una
  pantalla nueva.

### Subidas a B2 — `api/profile.ts` (avatar/portada)

```
GET   /files/upload-url?key=&contentType=  → presigned PUT a B2
GET   /files/stream?key=                   → presigned GET (playback)
PATCH /user/me { profilePicture | frontPage } → persiste la URL pública
```

> Highlights: la app **NO** recorta ni sube el clip. Llama `POST /highlights/from-recording`
> y el backend hace el recorte (FFmpeg byte-range) + subida a B2 + creación del highlight.

### Game detail (visor HLS) — `hooks/useGameDetail.ts`

```
GET  /game/:id   → detalle con cameras[] (stream HLS en camera.streamingUrl)
```

### Comentarios del stream (`GameComment`) — `hooks/useGameComments.ts`

Hilo **público y plano** del partido, en vivo. ⚠️ Son **tres cosas distintas** que no
se mezclan nunca:

| | Tabla | Endpoints | Quién |
|---|---|---|---|
| Comentarios del **stream** | `GameComment` | `GET·POST /game/:id/comments` | cualquiera; plano |
| Chat **privado** de la partida | `GameChatMessage` | `GET·POST /game/:id/chat` | solo participantes |
| Comentarios de **highlight** | `HighlightComment` | `POST /highlights/:id/comments` | threads (`parentId`) |

```
GET  /game/:id/comments?since=<ISO>   → GameComment[] (asc). `since` = poll incremental
POST /game/:id/comments  { comment }  → comentario creado (máx 500 chars)
```

- **`useGameComments(gameId, { enabled, author })`** — mismo transporte que `useGameChat`:
  REST + **polling 3 s focus-gated** (`useIsFocused`), cursor `since` = `createdAt` del
  último confirmado, envío optimista con revert. `enabled:false` corta fetch y poll (en
  `ReelViewScreen` solo poll-ea el reel visible, para no tener N pollers).
- **`components/GameCommentsPanel.tsx`** — panel presentacional compartido, dos variantes:
  `sheet` (colores del tema) y `overlay` (translúcido oscuro, para ir sobre el video).
- Lo consumen `GameDetailScreen` y `LiveReelItem` de `ReelViewScreen`.
#### El chrome del visor (2026-09-01)

No hay barra de header: **el video es el fondo y todo flota encima**, como un live.

```
┌───────────────────────────────────────────────┐
│ [foto] Club            [avatares +N]  [X]     │  ← identidad · quién mira · salir
│        ● EN VIVO  [Seguir]                    │
│                   (video)                     │
│  🙂 Ana  Buen punto                           │  ← comentarios SIN caja, sobre el video
│  🙂 Beto  vamos!                              │
│                                    [CAM 01…]  │
│ [ Escribe algo... ]      [💬] [➤] [⛶]        │  ← escribir · ocultar · compartir · full
└───────────────────────────────────────────────┘
```

⚠️ **Los comentarios NO vuelven a un panel** (2026-09-01). Flotan sobre la imagen —solo
texto con `textShadow`, sin fondo— y se escriben en la barra de abajo. Antes abrían un
panel que encogía el video a 16:9: leer o escribir te sacaba de lo que estabas mirando.
El `TextInput` vive en la barra; con `adjustResize` (ya en el manifest) el teclado la
empuja y el partido sigue a la vista. El botón 💬 **solo muestra/oculta** la capa.

El único panel que queda es el de **jugadores**, y el club **no está ahí**: se nombra una
sola vez, en el chip de arriba. Hay tests que fijan las tres cosas (comentarios visibles
sin abrir nada, el club una sola vez, el 💬 como toggle).

##### ⚠️ El teclado NO se cierra al comentar

En un vivo se comenta seguido: tener que reabrir el teclado en cada mensaje hace la
pantalla inusable. Se cerraba por **dos causas sumadas**, y hay que mantener las dos
corregidas o vuelve:

1. **`blurOnSubmit={false}` en el `TextInput`.** En un input de una línea el default es
   `true`, así que "enviar" quita el foco.
2. **El botón de enviar va SIEMPRE montado**, deshabilitado cuando no hay texto. Cuando
   aparecía y desaparecía según el borrador, ese desmontaje también robaba el foco (y
   movía la barra justo mientras escribías).

Además `submitComment` devuelve el foco explícitamente (`composerRef.current?.focus()`):
tocar el botón se lo saca al campo. Dos tests fijan (1) y (2).

##### Alturas: el partido gana

- **Capa de comentarios: `maxHeight: 25%`.** Estuvo en 42% y ocupaba casi media pantalla:
  distrae del partido. Lo que importa es lo último que se dijo; el historial está en el
  scroll de la propia capa.
- **Panel de jugadores: `flexGrow: 0` + `maxHeight: 55%`.** Mide lo que ocupa su contenido.
  Con `flex: 1` se estiraba hasta el borde inferior hubiera 1 jugador o 4, dejando un hueco
  vacío enorme, y para cederle ese espacio el video se encogía a un 16:9 fijo. Ahora el
  video se queda con `flex: 1` siempre: **lo que el panel no necesita, es partido**.

Nació de dos cosas rotas: había **dos "EN VIVO"** (la barra oscura y el badge sobre el
video) y un botón de **tres puntos que no hacía nada**.

- **`EN VIVO` se dice una sola vez**, dentro del chip del club. Hay un test que lo fija
  (`getAllByText('EN VIVO')` con longitud 1) — si volvés a agregar un badge, falla.
- **`Seguir` también vive una sola vez**, en el chip. Se sacó del panel de jugadores por
  el mismo motivo: dos botones para la misma acción en la misma pantalla.
- El lugar del menú muerto lo ocupa **Compartir** (ver abajo). Salir es la **X** de arriba
  a la derecha, no una flecha en una barra.
- El contador de espectadores va **pegado a los avatares**: "quiénes" y "cuántos" son la
  misma pregunta.
- Se quitó el texto `HLS · 1080p · CAM`: era ruido técnico y duplicaba el chip de cámara.

#### Compartir un partido — `ShareGameSheet`

El botón ➤ abre una hoja con tus **chats 1-a-1** (del inbox, sin endpoint nuevo) y manda
un DM con el partido adjunto. Se pueden elegir **varias personas**.

- Lo que hace que sea "enviar el partido" y no un texto suelto es **`DirectMessage.gameId`**
  (columna nueva, migración `20260901230000_direct_message_game`): el receptor ve una
  **tarjeta "Ver el partido"** en la burbuja, que abre el visor. Sin eso, compartir sería
  un mensaje que no lleva a ningún lado.
- Los envíos van **en serie**, no en paralelo: son pocos y así un fallo no deja la mitad
  mandada sin saber cuál.
- ⚠️ **Fuera de la app (WhatsApp) todavía NO.** Haría falta una URL pública del partido,
  que no existe: compartir un link que no abre nada es peor que no ofrecerlo. Cuando exista
  esa URL, el botón nativo (`Share.share`) se suma en esta misma hoja.

- **En `GameDetailScreen` (2026-08-29) el video manda y todo lo demás se abre desde él.**
  - **portrait**: sin panel abierto el video ocupa **toda** la pantalla bajo el header.
    Tocar comentarios o jugadores **encoge el video a su 16:9** y el panel toma la mitad
    de abajo (modelo Instagram): nunca lo tapa, nunca te saca de la pantalla. Estado
    `portraitPanel: null | 'comments' | 'players'` — **uno por vez**.
  - **landscape** (pantalla completa): los comentarios siguen siendo una columna
    superpuesta a la derecha (`variant="overlay"`), que arranca oculta.
  - ⚠️ **En landscape NO se escribe** (2026-08-31): el teclado en horizontal ocupa casi
    toda la pantalla y tapa el partido *y* el hilo que estás leyendo. Por eso el overlay
    recibe **`onComposePress`** y su campo deja de ser un `TextInput`: es un botón que
    sale de pantalla completa, rota a vertical y abre el panel de comentarios con el
    input **enfocado** (`autoFocus` + `onAutoFocusHandled` para bajar la bandera). El
    foco se pide con un respiro de 350 ms: pedido durante la rotación, se pierde.
    Cubierto por `screens/__tests__/GameDetailScreen.test.tsx`.

  Antes en portrait el CTA "Comentarios · N" abría un `<Modal>` a pantalla completa: para
  leer un comentario había que tapar el partido.
- ⚠️ `resizeMode` es **`CONTAIN` en los tres tamaños**: la fuente es 16:9 (cancha
  apaisada) y las cajas ya no lo son; con `COVER` el video a pantalla completa en vertical
  perdería media cancha por recorte.
- **La hoja de info debajo del video ya no existe** — no hay "debajo". Lo que vivía ahí se
  movió al panel **`players`**, que se abre con los **avatares superpuestos** al video
  (`testID="toggle-players"`) y trae club + jugadores + "Crear highlight". Se quitaron el
  chip de superficie (HARD) y la sección "Jugadores · N". Las **cámaras** pasaron a chips
  superpuestos abajo, y solo si hay más de una.
- **El panel es UN cuadro** (2026-09-01): arriba el **club** —su foto (`clubAvatar`), la
  etiqueta `CLUB` y el botón Seguir— y debajo los jugadores, separados por una línea.
  Antes eran dos tarjetas y el club quedaba al final, después de los equipos.
- **La pila de avatares sobre el video incluye al club**, primero. Para eso `AvatarStack`
  acepta `imageUri`: antes pintaba iniciales siempre, aunque hubiera foto.
- ⚠️ **Equipos solo si el dato existe.** `hasTeams` = hay alguien con `team === 2`. Sin eso
  va **una sola sección "Jugadores"**: rotular "EQUIPO 1" a los cuatro sería inventar una
  división que la partida no declaró (pasa en partidas viejas, donde `team` es null).
- **Club y jugadores abren su perfil** (`onOpenClub` / `onOpenPlayer`, cableados en
  `App.tsx` a `ClubProfile` / `PlayerProfile`). Los jugadores necesitan
  **`MatchParticipant.id`** (el UID): `useGameDetail` lo mapea desde `gp.user.id`. Sin id,
  la fila no navega en vez de romper.
- ⚠️ **`GET /game/:id` no traía el club** hasta el 2026-09-01: el select de `cameraConfig`
  no incluía `user`, así que `club`/`clubId` llegaban vacíos y el bloque salía sin nombre
  ni perfil. Si el club vuelve a verse vacío, mirá ese select antes que el mapper.
- **Los seguidores del club ya no se muestran**: ese número no viaja en `GET /game/:id`
  (iba `clubFollowers: 0` fijo) y en medio de un partido no aporta nada. Se borró el campo
  del tipo.
- ⚠️ `team` y `profilePicture` ya venían en `GET /game/:id` pero `useGameDetail` **no los
  mapeaba**: sin eso no hay dos parejas ni fotos reales. Si agregás un campo del jugador,
  revisá ese mapper.
- **El botón "Seguir" del club no se muestra si ya lo seguís** (antes decía "Siguiendo" y
  dejaba de seguir de un toque, en el medio del partido). La baja se hace desde el perfil
  del club. Cubierto por `screens/__tests__/GameDetailScreen.test.tsx`.
- ⚠️ Si el backend desplegado todavía no soporta `?since=`, el endpoint **ignora** el
  parámetro y devuelve el hilo completo en cada poll: sigue funcionando (el hook dedupea
  por `id`), solo que sin ahorro de payload.

> Nota: la app **NO** crea ni edita Courts, Slots ni Cameras. Esos
> endpoints son de **lectura solamente** desde la app. El admin externo es
> el único escritor.

### Chats — inbox unificado + DMs 1-a-1 — `api/chat.ts`

La pestaña **Chats** (ambos roles, reemplazó a "Jugadores") es un inbox que unifica dos
tipos de conversación: **DMs 1-a-1** entre usuarios (feature nueva) y **chats grupales de
partidas** (los de `GameChatMessage`, cualquier estado — finalizada/cancelada = solo lectura).

```
GET  /chat/inbox            → InboxItem[] (DMs + grupos de partidas), desc por actividad
GET  /chat/dm/:userId?since= → hilo 1-a-1 (find-or-create), más antiguos primero
POST /chat/dm/:userId        → enviar DM { content }
POST /chat/dm/:userId/read   → marcar el hilo como leído (limpia el badge del inbox)
```

- **`useInbox`** (`hooks/useInbox.ts`) → `ChatsInboxScreen` (tab Chats). `InboxItem`:
  `{ kind:'dm'|'game', id, otherUserId?, title, avatar, lastMessage, lastMessageAt, unreadCount, readOnly }`.
  Tap dm → `DirectChat`; tap game → `GameChat`. Botón **"Nuevo chat"** → `GlobalSearch { mode:'chat' }`
  (reusa el buscador; elegir un usuario abre/crea el DM).
- **Dos bandejas, un solo endpoint**: arriba de la lista hay un segmented control
  **Partidas** (`kind:'game'`) / **Amigos** (`kind:'dm'`) que **filtra en el cliente** lo que
  ya trajo `GET /chat/inbox` — no hay request por bandeja. Arranca en **Partidas**. Cada
  botón muestra el total de no leídos de su bandeja **—real en las dos desde 2026-08-30**,
  antes los grupos de partida daban 0 fijo— y el estado vacío es el de la bandeja elegida.
  Cubierto por `screens/__tests__/ChatsInboxScreen.test.tsx`.
- **`useDirectChat`** (`hooks/useDirectChat.ts`) → `DirectChatScreen`. **Copia de `useGameChat`**
  keyed por el UID del otro usuario: REST + polling 3s focus-gated, `since` incremental, envío
  optimista. Al montar hace `markDmRead`. Sin modo read-only (los DMs siempre se escriben).
- **Iniciar un DM**: botón **"Mensaje"** (`MessageCircle`) en `PlayerProfilePublicView` y
  `ClubProfilePlayerView` (prop `onMessage`, oculto en el perfil propio) → `DirectChat`; o el
  "Nuevo chat" del inbox. Un club es un `User` → el DM con clubs funciona igual.
- **Backend**: modelos `Conversation`/`ConversationParticipant`/`DirectMessage` (1-a-1 vía
  `pairKey` determinística; genéricos para grupos ad-hoc a futuro). El inbox agrega los chats de
  partidas vía `GameService.getMyGameThreads` (todos los estados). **Unread real en los dos**
  (2026-08-30): DMs por `ConversationParticipant.lastReadAt` y grupales por
  `GamePlayer.lastReadAt`.
- **Marcar como leído**: `useGameChat` llama a **`markGameChatRead(gameId)`**
  (`api/games.ts` → `POST /game/:id/chat/read`) al montar, igual que `useDirectChat` llama a
  `markDmRead`. Es best-effort: si falla, el contador se corrige en la próxima apertura.
  ⚠️ Si mockeás `api/games` en un test que monta `useGameChat`, **incluí `markGameChatRead`**
  o el `.catch(...)` revienta sobre `undefined`.
- **Push + campanita**: OneSignal `type:'NEW_DM_MESSAGE' { conversationId, fromUserId }` → el
  handler navega a `DirectChat`; el grupal usa `NEW_CHAT_MESSAGE { gameId }` → `GameChat`.
  Desde el 2026-08-30 **cada mensaje deja además una fila en la campanita**, colapsada por
  conversación (una sola sin leer por chat) — ver abajo.

#### Las listas de mensajes van `inverted` (2026-08-30)

`GameChatScreen`, `DirectChatScreen` y `GameCommentsPanel` renderizan su `FlatList`
con **`inverted`** y los datos **al revés** (`[...messages].reverse()`), de modo que el
índice 0 —el más nuevo— se dibuja abajo.

⚠️ **No las devuelvas a una FlatList normal con `scrollToEnd`.** Era lo que había y estaba
roto: las burbujas son de alto variable y no hay `getItemLayout`, así que `scrollToEnd`
(tanto el del `useEffect` por `messages.length` como el de `onContentSizeChange`) saltaba a
un offset calculado con **alturas estimadas** y caía **en el medio** del hilo. Resultado: con
cada mensaje propio o entrante había que bajar a mano. Invertida, el último mensaje queda
abajo **por layout** y no hay ningún scroll que pueda fallar.

Consecuencias a respetar si tocás estas pantallas:

- **"El final" es `scrollToOffset({ offset: 0 })`**, no `scrollToEnd`. Se llama al enviar,
  para bajar si estabas leyendo hacia arriba.
- **El estado vacío va fuera de la lista**, no como `ListEmptyComponent`: el contenedor de
  una invertida lleva un `scaleY(-1)` y saldría dado vuelta. Por eso `messages.length === 0`
  es una rama aparte del render.
- **`removeClippedSubviews={false}`** — Android recicla celdas con transform y las deja en
  blanco.
- Nada de `flexGrow: 1` en el `contentContainerStyle` (con pocos mensajes ya quedan abajo).
- Si subís a leer, aparece **`<JumpToLatestButton/>`** (`components/ui.tsx`, flotante lima)
  a partir de 240 px de scroll.

#### Borrar un chat — swipe + `ConfirmSheet` (2026-09-01)

**Deslizar la fila del inbox hacia la izquierda** descubre una **papelera roja**; tocarla
abre la confirmación. Borra **solo para vos**: no se toca ningún mensaje y el otro sigue
viendo el hilo entero (`DELETE /chat/dm/:userId` · `DELETE /game/:id/chat`).

- **`Swipeable` de gesture-handler**, no `onLongPress`. El long-press que había primero
  obligaba a descubrir un gesto invisible; el swipe es el patrón que la gente ya conoce de
  Mail/WhatsApp. Y no pelea con el scroll de la lista: el handler separa los gestos por
  dirección. `rightThreshold={40}` + `overshootRight={false}` para que un swipe corto
  vuelva solo y abrir la papelera sea deliberado.
- La fila se **cierra sola** al tocar la papelera (`swipeRef.current.close()`): si después
  cancelás, no queda una fila abierta a medias.
- **Sin `onDeleteChat` no se envuelve en `Swipeable`**: un swipe que no hace nada es peor
  que no tenerlo.
- La confirmación **no nombra el chat**: ya elegiste la fila, repetir el nombre solo alarga
  la pregunta. Lo que sí dice es el alcance ("solo para ti").

⚠️ **`Alert.alert` no se usa para decisiones de producto.** El Alert nativo se ve distinto
en cada OS, ignora el tema claro/oscuro, no usa la tipografía de la marca y en Android pinta
los botones en azul de sistema — lo contrario de lo que necesita una acción destructiva. Para
eso está **`components/ConfirmSheet.tsx`**: mismo patrón que `FollowListSheet` (Modal
transparente, velo azul, hoja con drag handle), con `destructive` para el botón rojo y
`loading` para el spinner. Reusalo en la próxima confirmación en vez de traer un Alert.

#### Likes de mensajes (corazón)

Los mensajes de **ambos** chats (grupal de partida y DM) se pueden likear.

```
POST /game/:id/chat/:messageId/like   → toggle en el chat de la partida
POST /chat/message/:messageId/like    → toggle en un DM
                       ambos devuelven { messageId, likesCount, likedByMe }
```

- **Un like por persona por mensaje** — lo garantiza un índice único
  `(messageId, userId)` en la DB, no el cliente. Tocar de nuevo el corazón lo quita
  (toggle). La misma persona sí puede likear muchos mensajes distintos.
- `likesCount` = **cuánta gente** likeó ese mensaje (en un grupal puede ser >1; en un DM,
  máximo 2). Se muestra con `<MessageLikeButton/>` (`components/ui.tsx`): un corazón +
  el número. Sin rojo — likeado = corazón lima relleno, si no contorno gris azulado.
- El botón va **fuera de la burbuja**: adentro competiría con el fondo lima de los
  mensajes propios.
- `toggleLike` de `useGameChat`/`useDirectChat` es **optimista con revert**, y la respuesta
  del servidor pisa el total (puede haber cambiado si otro likeó en el medio). El valor
  previo se lee de un **ref**, no del updater de `setState`: el updater puede correr
  después del `await` y dejaba al revert sin nada que restaurar.
- ⚠️ **El poll incremental necesitaba un ajuste**: con `since`, el backend ahora también
  devuelve los mensajes **viejos con actividad de likes posterior al cursor**. Sin eso, un
  like sobre un mensaje anterior no llegaba nunca (el poll solo miraba `createdAt` del
  mensaje). El hook dedupea por id, así que reenviar un mensaje conocido solo refresca su
  contador. Un *unlike* ajeno sí puede tardar hasta la próxima carga completa.
- Cubierto por `hooks/__tests__/useGameChatLikes.test.ts` y, en el backend,
  `GameService toggleGameChatMessageLike` en `game.service.spec.ts`.

### Notificaciones push (OneSignal)

La app usa **`react-native-onesignal`** (NO `expo-notifications`). **Todo vive en
`services/notifications.ts`** — init, listeners, ruteo e identidad. `App.tsx` solo llama
`initNotifications(navigationRef)` y le pasa `onNavigationReady` al `NavigationContainer`.

```
PUT    /user/update-notification-id  { notificationID }  → registra el push token
DELETE /user/notification-id                             → lo borra (logout)
```

**Ruteo — `resolvePushTarget(additionalData)`** traduce el push a pantalla. Son los **11
tipos** que emite el backend (cubiertos por `services/__tests__/notifications.test.ts`):

| `type` | Pantalla |
|---|---|
| `STREAMING_STARTED` · `RECORDING_READY` · `GAME_FINISHED` · `GAME_SCHEDULED` | `GameDetail { gameId }` |
| `NEW_CHAT_MESSAGE` | `GameChat { gameId }` |
| `NEW_DM_MESSAGE` | `DirectChat { userId: fromUserId }` |
| `GAME_CANCELLED` · `GAME_PLAYER_LEFT` · `GAME_PAIR_CANCELLED` · `GAME_PLAYER_ADDED` · `GAME_APPLICATION_RECEIVED` | `MainPlayer { initialTab: 'games' }` |

- **La misma tabla resuelve el tap en la campanita**: cada notificación guardada trae el
  mismo `data` que viajó en el push, así que `NotificationsScreen` no necesita un ruteo
  propio (ver "Notificaciones in-app" abajo).
- Se normaliza a mayúsculas: producción todavía manda los tres últimos en minúscula
  (`game_cancelled`, …), así que se aceptan ambas formas.
- **`addPushReceivedListener(cb)`**: mini pub-sub que emite el `additionalData` desde los
  DOS listeners (`click` y `foregroundWillDisplay`). Lo consume `useNotificationBadge`
  para refrescar el contador con la app abierta, sin polling.
- **Cold start**: si el tap llega antes de que monte el navigator, el destino se guarda
  y se aplica en `onNavigationReady()`. Sin eso el `navigate` se perdía en silencio.
- **Primer plano: el banner del OS NUNCA se muestra** (desde 2026-08-30
  `foregroundWillDisplay` llama siempre a `preventDefault()`). O el usuario ya está parado
  en la pantalla de destino —y entonces no hay nada que avisar—, o lo avisa la **mini
  notificación in-app** (ver abajo). Antes el banner del sistema se mostraba tal cual, que
  en primer plano muchas veces ni aparece: un mensaje de chat mientras estabas en otra
  pantalla no dejaba ninguna señal.
- ⚠️ **El campo DEBE ser `notificationID` (con `ID` mayúscula)** para coincidir con el
  DTO del backend (`forbidNonWhitelisted`); un `notificationId` con `d` minúscula da
  **400** y el token nunca se registra → no llega ningún push.
- **Registro auto-reparable**: `identifyUser(uid, idToken)` corre en cada login **y al
  restaurar sesión**. Hace `OneSignal.login(uid)` (external ID), pide permiso **en
  contexto** (ya no en el arranque frío) y, si el subscription ID todavía no existe,
  espera el evento `change` en vez de abandonar hasta el próximo login.
- **Logout**: `clearIdentity(token)` borra el `notificationId` en el backend y hace
  `OneSignal.logout()`. Sin esto el que cerró sesión seguía recibiendo sus pushes en
  ese teléfono.
- Env: `EXPO_PUBLIC_ONESIGNAL_APP_ID`. La app **solo recibe** push; no hay WebSocket ni
  polling en tiempo real (los datos se refrescan al montar o con pull-to-refresh).
- 🩺 **Si no llega ningún push, mirá el logcat ANTES de tocar el código.** El síntoma real
  que apareció el 2026-08-30 no estaba en el código sino en el **estado local del SDK**:

  ```
  OneSignal: STATUS: 400 - {"errors": ["Failed to parse app_id from request", …]}
  [OpRepo] Operation execution failed with eventual retry, pausing the operation repo:
    [{"name":"login-user","appId":""}, {"name":"create-subscription","appId":""}, …]
  ```

  OneSignal **persiste sus operaciones pendientes** en el almacenamiento de la app. Las que
  se encolaron cuando el app id estaba vacío quedan con `appId: ""` para siempre, fallan con
  400 y **pausan la cola entera** (`pausing the operation repo`): a partir de ahí ninguna
  operación nueva se ejecuta, el dispositivo nunca obtiene subscription id y el token jamás
  se registra en el backend. Sobreviven a `adb install -r` porque no se borran los datos.

  **Diagnóstico**: `adb logcat -d | grep -i onesignal` — si ves `"appId":""`, es esto.
  **Arreglo**: `adb shell pm clear io.torna` (o desinstalar/reinstalar) y volver a entrar.
  Ojo: borra la sesión guardada en SecureStore, hay que loguearse de nuevo.
  Del lado del servidor, `POST /diagnostics/test-push` lo confirma: reporta
  `tokenRegistrado: false` mientras la cola esté envenenada.
- ⚠️ **En tests, `babel-preset-expo` inlina las `EXPO_PUBLIC_*` en tiempo de transform**:
  setear `process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID` dentro de un test llega tarde (el
  módulo ya quedó compilado con el valor vacío y `initNotifications` corta al toque). Por
  eso se define en **`jest.config.js`**, antes de que jest transforme nada.

#### Mini notificación in-app (banner propio) — `components/InAppNotification.tsx`

Tarjeta que aparece arriba cuando llega un push **con la app abierta**. Reemplaza al banner
del sistema en primer plano. El caso que la motivó es el chat, pero sirve para los 11 tipos.

```
OneSignal 'foregroundWillDisplay'
  → services/notifications.ts: preventDefault() + emitForeground({ title, body, data, target })
  → addForegroundPushListener  →  <InAppNotificationHost/>
  → tap → navigate(target)   (misma tabla que el push y la campanita)
```

- **`addForegroundPushListener(cb)`** es un pub-sub aparte de `addPushReceivedListener`: ese
  avisa "hubo actividad" (para el contador de la campanita) y **no** cambió de firma; el
  nuevo trae además el **texto** (`title`/`body` de la notificación) y el `target` ya resuelto.
  Solo dispara desde `foregroundWillDisplay` — nunca desde `click`, que ya navega solo.
- **No dispara si el usuario ya está parado en la pantalla de destino** (`isAlreadyOnTarget`).
- **`<InAppNotificationHost/>` se monta en `Root` (`App.tsx`), DESPUÉS del navigator y dentro
  del `NavigationContainer`** (queda encima). Vive fuera de los navigators, así que recibe el
  **`navigationRef` por prop** — `useNavigation()` ahí adentro tira. Aplica el mismo ajuste
  que la campanita: `MainPlayer` → `MainClub` si la cuenta es de club.
- Uno por vez (el nuevo reemplaza al anterior y reinicia el temporizador), se va sola a los
  4.5 s, con la X, al tocarla o deslizándola hacia arriba.
- Cubierto por `services/__tests__/notifications.test.ts` (`addForegroundPushListener`).

### Notificaciones in-app (campanita) — `api/notifications.ts`

La campanita del header (Inicio de player y de club) dejó de ser decorativa: lista el
historial de notificaciones con no leídos.

**Los chats TAMBIÉN están acá desde el 2026-08-30** (antes no: eran push-only). El motivo del
cambio es que si el push se perdía no quedaba ningún rastro del mensaje. Entran **colapsados
por conversación**: una sola fila sin leer por chat, que se refresca con el último mensaje y
sube al tope — no una fila por mensaje. El tap se rutea con la misma tabla que el push
(`resolvePushTarget`), así que no hubo que tocar nada en la app para que funcione.

```
GET   /notification?limit=&cursor=  → { items, nextCursor, unreadCount }
GET   /notification/unread-count    → { count }      (badge)
PATCH /notification/:id/read        → { ok: true }
PATCH /notification/read-all        → { updated }
```

- **`useNotifications`** (`hooks/useNotifications.ts`) → `NotificationsScreen` (ruta
  `Notifications`, apilada, sin tab propio). Carga al montar + refetch al foco (como
  `useInbox`), `loadMore` por **cursor de id** con dedupe, y `markRead`/`markAllRead`
  **optimistas con revert desde un ref** (el updater de `setState` puede correr después
  del `await`). **Sin polling por intervalo.**
- **`useNotificationBadge`** (`hooks/useNotificationBadge.ts`) — solo el contador. Lo
  montan `MainPlayer`/`MainClub`; se refresca al foco de la app, con el pull-to-refresh y
  cuando llega un push (`addPushReceivedListener`). Va aparte para no traer 20 filas cada
  vez que se vuelve a Inicio.
- **`NotificationBell`** (`components/ui.tsx`) — campanita + badge lima con el número
  (antes era un `Pressable` sin `onPress` con un punto rojo fijo, fuera de la paleta).
- El tap marca leída (optimista) y navega con `resolvePushTarget(item.data)`. ⚠️ Si el
  destino es `MainPlayer` y el usuario es club, el contenedor redirige a `MainClub`.
- ⚠️ Mandar cualquier query param que no sea `limit`/`cursor` da **400**
  (`forbidNonWhitelisted` del backend).
- Cubierto por `hooks/__tests__/useNotifications.test.ts` y
  `screens/__tests__/NotificationsScreen.test.tsx`.

---

## 📱 Stack técnico

| | |
|---|---|
| **Framework** | Expo SDK 51 · React Native 0.74 · React 18.2 · TypeScript 5.3 strict |
| **Plataformas** | iOS (principal) · Android |
| **Navegación** | `@react-navigation/native` v6 + `native-stack` |
| **Estilos** | StyleSheet inline + tokens de `theme/tokens.ts` (NO styled-components, NO Tailwind) |
| **Iconos** | `lucide-react-native` (size 22 default, stroke 2) |
| **Tipografía** | Helvetica (manual de marca) — TODO migrar H1 a Coolvetica |
| **SVG** | `react-native-svg` (`<Svg>`, `<Rect>`, `<Line>`, `<Path>`) |
| **Video / HLS** | `expo-av` ~14.0.7 (reproductor HLS). **Fullscreen**: in-app, NO el nativo, en `GameDetailScreen` (landscape, ver abajo) y en `VideoPreviewModal` (estado `expanded`). En ambos casos es la **misma instancia** de `<Video>` (solo cambia el estilo del contenedor: card ↔ absolute-fill), nunca un `Modal` con un segundo `<Video>`. `ReelViewScreen` y el `Player` del editor sí siguen usando el nativo `videoRef.current.presentFullscreenPlayer()`. Regla: **si hay que superponer algo sobre el video (comentarios), tiene que ser fullscreen in-app** — el nativo no admite overlays |
| **Orientación** | La app está bloqueada en **portrait** (`app.json` + `android:screenOrientation="portrait"` en el manifest). La **única** excepción es la pantalla completa del stream (`GameDetailScreen`), que rota a landscape con `expo-screen-orientation` ~7.0.5: `lockAsync(LANDSCAPE)` al entrar y `PORTRAIT_UP` al salir / al desmontar / con el botón atrás. En Android `setRequestedOrientation` en runtime **pisa** el valor del manifest, y el manifest ya trae `configChanges` con `orientation\|screenSize`, así que la activity no se recrea. ⚠️ **En iOS no alcanza**: `UISupportedInterfaceOrientations` es un límite duro y `orientation: "portrait"` en `app.json` lo escribe solo-portrait (el mod `withOrientation` pisa lo que pongas en `ios.infoPlist`). Para habilitarlo en iOS hay que pasar `orientation` a `"default"` y bloquear `PORTRAIT_UP` globalmente al arrancar la app |
| **Mapas** | Sin mapa embebido ni librería de mapas. La ubicación se referencia con un botón **"Buscar en Maps"** (`components/MapsButton.tsx`) que abre **Google Maps** (URL universal `maps/search/?api=1&query=lat,lng`) vía `Linking`. Antes había Leaflet en `react-native-webview` + MapTiler; se quitó para no requerir dev-client ni API key |
| **Ubicación** | Las ubicaciones de club se abren en **Google Maps** vía `MapsButton` (`Linking`), usando lat/lng del club (pin exacto) o el nombre como fallback — sin mapa embebido. `expo-location` ~17.0.1 volvió el 2026-09-01, con **un solo uso**: el aviso de partidas abiertas cercanas (`lib/location.ts` + `hooks/useNearbyLocation.ts`). Permiso **solo foreground** (`NSLocationWhenInUse`); nada de background |
| **Subida de archivos** | `expo-file-system` ~17.0.1 (`uploadAsync` binario → B2 presigned) |
| **Gestos** | `react-native-gesture-handler` ~2.16.1 (swipe entre cámaras, editor) |
| **Fuentes** | `expo-font` ~12.0.0 (carga de .ttf custom) |
| **Notificaciones** | `react-native-onesignal` ~5.2.10 + `onesignal-expo-plugin` (push; registro vía `notificationID`). Ver "Notificaciones push (OneSignal)" arriba |
| **Procesamiento de video** | **Server-side** en el backend (`POST /highlights/from-recording`: FFmpeg byte-range → B2). La app ya **no** usa `ffmpeg-kit-react-native` (crasheaba y estaba fuera de `package.json`). |
| **Splash / icon** | `assets/torna-icon.png` (1024×1024) · fondo `#2d4c75` |
| **Bundle IDs** | iOS: `io.torna` · Android package: `io.torna` |
| **Auth** | `@react-native-firebase/auth` v20 (SDK 51-compatible; v21+ es ESM y rompe `@expo/config-plugins@8`) · `@react-native-google-signin` v13 · `expo-apple-authentication` |
| **Storage** | `expo-secure-store` (auth tokens) · `@react-native-async-storage` (tema) |

---

## 🎨 Sistema de diseño · MANUAL DE MARCA

**Solo 3 colores.** Sin excepciones, sin gradients.

### Color

| Token | Hex | Uso |
|---|---|---|
| **Classic Blue** | `#2d4c75` | Ink, texto en claro, surface en oscuro, dot del LIVE |
| **Light Lime** | `#D6FF7E` | CTAs, accent, badges, switches activos, LIVE bg |
| **White** | `#FFFFFF` | Text sobre azul, surface en claro |

Neutrals = opacidades de `#2d4c75`. **No hay grises separados.**

Paletas viven en `theme/tokens.ts` (`lightColors`, `darkColors`). El
`ThemeProvider` re-renderiza al togglear el modo.

#### Token clave: `T.accentText`

Lima sobre blanco es ilegible (contrast ratio < 2:1) y azul sobre azul es
invisible. `accentText` flippea según modo:

| Superficie | `T.primary` (CTA bg) | `T.accentText` (texto accent) |
|---|---|---|
| Light (blanco) | `#D6FF7E` | `#2d4c75` |
| Dark (azul) | `#D6FF7E` | `#D6FF7E` |

**Reglas:**
- Para fondo de CTA usar `T.primary` (lima) con `T.primaryFg` (azul) como
  color del texto interno.
- Para texto/icono "accent" sobre superficies neutras usar `T.accentText`.

#### Status colors — colapsados al brand

| | bg | fg |
|---|---|---|
| LIVE | `T.live` (lima) | `T.ink` (azul) + dot azul |
| WARN / OK / INFO | `T.warnBg/okBg/infoBg` (lima 18–22%) | `T.warnFg/okFg/infoFg` (azul) |
| SCHEDULED / PENDING / STOPPED | outline blue (sin bg) | `T.text` / `T.muted2` |

#### La única excepción: el rojo destructivo

`colors.destructive` (`#D94A3D`) + `colors.destructiveFg` existen **solo** para el
affordance de destruir: el fondo del swipe de borrar y el botón de confirmar de
`ConfirmSheet`. Borrar no es un status decorativo — si el botón que destruye algo se ve
igual que el resto, la gente lo toca sin registrar qué hace.

⚠️ No lo uses para errores de formulario, badges ni texto: para eso está `danger`, que
sigue siendo el azul de marca.

#### Gradients están prohibidos

Donde el código viejo tenía `LinearGradient`, ahora hay fills sólidos. Si
se necesita profundidad, usar sombras (`shadows.*`), no gradients.

### Tipografía

| Familia | Peso | Uso |
|---|---|---|
| Coolvetica Regular | 400 | H1 (TODO: aún no shipped, fallback Helvetica Bold) |
| Helvetica Bold | 700 | H2, títulos, labels, badges |
| Helvetica Regular | 400 | Body, captions |

En `theme/tokens.ts`:
```ts
fonts.regular   → 'Helvetica' (iOS) / 'sans-serif' (Android)
fonts.bold      → 'Helvetica-Bold' (iOS) / 'sans-serif' (Android, sintético)
fonts.display   → 'Helvetica-Bold' (TODO: 'Coolvetica' cuando se sume el .ttf)
fonts.mono      → 'Menlo' (iOS) / 'monospace' (Android)
```

**🚨 React Native NO elige variant de una fuente custom según `fontWeight`.**
Hay que pasar `fontFamily` explícito. Tres caminos correctos:

```tsx
// 1. Token de tipografía (preferido)
<Text style={typography.h2}>Partidos</Text>

// 2. Helper manropeFont(weight)  (se llama así por back-compat)
<Text style={{ fontFamily: manropeFont('700'), fontSize: 18 }}>Hola</Text>

// 3. Familia directa
<Text style={{ fontFamily: fonts.bold }}>Hola</Text>
```

Para IDs de partido, hashes, números de cámara → `fonts.mono`. Nunca para
body text.

### Espaciado y radios

Escala de 4 px:
```
spacing: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
radii:   none, xs(2), sm(4), md(6), lg(8), xl(12), 2xl(16), 3xl(24), pill
```

### Iconos

`lucide-react-native`. Tamaño default 22, stroke 2. Color hereda del tema
(`colors.text`, `colors.muted2`, etc.).

---

## 📁 Estructura

```
expo/
├── App.tsx                 # Stack navigator + role-aware containers
├── index.ts                # registerRootComponent
├── app.json                # config Expo (name, icon, splash, bundle IDs)
├── package.json            # deps SDK 51
├── tsconfig.json
├── babel.config.js
├── assets/
│   ├── torna-icon.png      # icono app + splash + logo in-app (1024×1024)
│   └── racket.png          # EmptyState ilustración
├── theme/
│   ├── tokens.ts           # lightColors · darkColors · spacing · radii · typography · shadows · accentText
│   ├── ThemeProvider.tsx   # contexto · useTheme() · persistencia AsyncStorage
│   └── index.ts            # barrel
├── components/
│   ├── ui.tsx              # Button · Input · StatusBadge · SurfaceChip · ClubPill
│   │                       # Avatar · AvatarStack · EmptyState · SectionHeader
│   │                       # AppHeader · Switch
│   ├── cards.tsx           # LiveGameCard · LiveGameTile · GameListItem
│   │                       # CourtCard · CameraAngleCard · PlayerListItem · FeedPost
│   ├── BottomTabBar.tsx    # 5 tabs por rol, Inicio centrado
│   ├── PlayerSearchOverlay.tsx  # overlay autofocused para picking de player
│   ├── ContentThumb.tsx         # thumbnail para ítems de librería (match/highlight/foto/video)
│   ├── UploadSheet.tsx          # modal bottom-sheet para subir contenido (2 pasos: tipo → config)
│   ├── VisibilityPill.tsx       # toggle chip Privado/Público
│   ├── VideoPreviewModal.tsx    # modal reproductor de video: preview + pantalla completa
│   ├── FollowListSheet.tsx      # modal lista de seguidores/siguiendo
│   ├── UpcomingMatchSheet.tsx   # detalles de próximo partido
│   ├── ApplyMatchSheet.tsx      # solicitar unirse a partido abierto
│   └── MapsButton.tsx           # botón "Buscar en Maps" → abre Google Maps (Linking)
├── screens/
│   ├── LoginWithRoleScreen.tsx
│   ├── RegisterClubScreen.tsx       # ⚠️ mock: onSubmit no crea la cuenta (ver Auth)
│   ├── RegisterPlayerScreen.tsx     # alta Player por email/contraseña (instantánea)
│   ├── PendingApprovalScreen.tsx
│   ├── CompleteProfileScreen.tsx   # completar perfil tras social login (username + nombre)
│   ├── HomeScreen.tsx               # player home
│   ├── ClubHomeScreen.tsx           # club admin home
│   ├── GamesScreen.tsx
│   ├── GameDetailScreen.tsx         # visor HLS con expo-av (TODO: swipe entre cámaras)
│   ├── CourtsScreen.tsx
│   ├── PlayersScreen.tsx
│   ├── ProfileScreen.tsx            # club profile + password
│   ├── PlayerOwnProfileScreen.tsx   # perfil propio del player (tabs + grid)
│   ├── MyLibraryScreen.tsx          # librería privada del player
│   ├── PlayerSettingsScreen.tsx     # ajustes + editar perfil + password
│   ├── video-editor-screen/
│   │   ├── index.tsx                # VideoEditorScreen (5 pasos)
│   │   ├── components/
│   │   │   ├── Player.tsx           # reproductor de preview
│   │   │   └── TrimRangeSlider.tsx  # slider de rango para trim
│   │   ├── hooks/
│   │   │   └── useVideoEditorFlow.ts
│   │   └── steps/
│   │       ├── PreviewStep.tsx
│   │       ├── TrimStep.tsx
│   │       ├── MetadataStep.tsx
│   │       ├── ProcessingStep.tsx
│   │       └── ResultStep.tsx
│   ├── ClubProfilePlayerView.tsx    # POV player
│   ├── PlayerProfilePublicView.tsx
│   ├── GlobalSearchScreen.tsx      # búsqueda global de players + clubs por texto (sin canchas)
│   ├── NotificationsScreen.tsx      # campanita: historial de notificaciones (sin chats)
│   ├── ReserveBlocksScreen.tsx      # paso 1: día + bloque libre (cancha adentro del bloque)
│   ├── ReserveStep3Screen.tsx       # paso 2: players + confirmar
│   ├── ReserveSuccessScreen.tsx
│   ├── reserveCommon.tsx            # StepIndicator compartido
│   └── index.ts                     # barrel de exports
├── contexts/
│   └── AuthContext.tsx      # useAuth() · session restore (SecureStore) · social login
├── hooks/
│   ├── useLiveGames.ts      # GET /game/live → LiveGameData[]
│   ├── useOpenGames.ts      # GET /game/open → partidas abiertas
│   ├── useMyGames.ts        # GET /game/mine → mis partidas activas (equipos/rol)
│   ├── usePlayerMatches.ts  # GET /game/player/:id/history → LibraryMatch[]
│   ├── useGameDetail.ts     # GET /game/:id → GameDetailData (cámaras/HLS) + recordingUrl
│   ├── usePlayers.ts        # GET /user/players → PlayerData[]
│   ├── useNotifications.ts  # GET /notification → lista de la campanita (cursor + optimista)
│   ├── useNotificationBadge.ts # GET /notification/unread-count → badge del header
│   └── useUserProfile.ts    # GET /user/profile/:id + /highlights?userId= → PlayerPublic
├── api/
│   ├── users.ts            # fetchUserProfile · searchUsers
│   ├── clubs.ts            # fetchNearbyClubs · fetchClubCourts · fetchCourt · fetchCourtSlots · createReservation
│   ├── games.ts            # fetchMyGames · applyToGame · accept/rejectApplication · cancelGame · leaveGame · cancelChallengerPair
│   ├── highlights.ts       # fetchUserHighlights · fetchMyHighlights · createHighlightFromRecording (POST /highlights/from-recording)
│   ├── notifications.ts    # fetchNotifications · fetchUnreadCount · markNotificationRead · markAllNotificationsRead
│   └── profile.ts          # uploadProfilePicture · uploadFrontPage (expo-file-system → B2)
└── data/
    └── types.ts            # tipos públicos (ClubPublic, NearbyClub, PlayerPublic, Slot, etc.) — sin mocks
```

---

## 🧭 Navegación

Stack único en `App.tsx`. `initialRouteName="LoginWithRole"`.

| Ruta | Pantalla | Disponible para | Params |
|---|---|---|---|
| `LoginWithRole` | Login con role-picker | ambos | — |
| `Register` | Alta de club | club | — |
| `Pending` | Aprobación pendiente | club | — |
| `CompleteProfile` | Completar perfil (social) | ambos | `{ idToken: string }` |
| `MainPlayer` | Tabs internos player | player | — |
| `MainClub` | Tabs internos club | club | — |
| `GameDetail` | Visor HLS | ambos | `{ gameId }` |
| `GameChat` | Chat grupal de una partida | ambos | `{ gameId, title?, readOnly? }` |
| `DirectChat` | Chat directo 1-a-1 con un usuario | ambos | `{ userId, title? }` |
| `Notifications` | Campanita: historial de notificaciones (sin chats) | ambos | — |
| `ClubProfile` | Perfil público del club | player | `{ clubId }` |
| `PlayerProfile` | Perfil público de un player | player | `{ playerId }` |
| `ReserveBlocks` | Paso 1 — día + bloque libre (`courtId` = filtro inicial) | player | `{ clubId, courtId? }` |
| `ReserveInvite` | Paso 2 — switch + players | player | `{ courtId, courtLabel, date, slotStart, slotEnd, durationMinutes }` |
| `ReserveOk` | Confirmación | player | `{ reservationId }` |
| `VideoEditor` | Editor de highlight (5 pasos) | player | `{ matchId, clipData }` |

### Bottom tab bar (role-aware)

`BottomTabBar` recibe `role: 'club' | 'player'`.

| Rol | Tabs |
|---|---|
| **club** (5) | Canchas · Juegos · **Inicio** · Chats · Perfil |
| **player** (4) | **Inicio** · Juegos · Chats · Perfil |

**No hay pestaña "Buscar" ni "Jugadores".** El player tiene **4 tabs**; todas cambian
contenido. La búsqueda de gente/clubs vive en el ícono de búsqueda del header de
**Inicio** (`onOpenSearch` → `GlobalSearch`). La pestaña **Juegos** es el hub de partidos:
**Mis partidas** + **Abiertos para sumarme** + acción **Reservar** en el header. La pestaña
**Chats** (ambos roles) es el inbox de conversaciones (ver "Chats" abajo).

El componente NO es `@react-navigation/bottom-tabs` — es estado local en
`MainPlayer` / `MainClub`. Esto permite layouts custom por tab.

### Sin destellos blancos en transiciones

Los navigators son **`native-stack`** (`@react-navigation/native-stack`). Todo
`native-stack` Navigator DEBE declarar su fondo en `screenOptions`, si no se ve
un **destello blanco** de la ventana nativa entre escenas durante la animación:

```tsx
const { colors } = useTheme();
<AppStack.Navigator
  screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
>
```

- ⚠️ En native-stack la prop es **`contentStyle`**, NO `cardStyle` (esa es del
  stack JS `@react-navigation/stack` y acá no hace nada).
- El `background`/`card` del `theme` del `NavigationContainer` (`navTheme` en
  `Root`) cubre el root, pero **no** el contenedor de escena en plena animación:
  el `contentStyle` es imprescindible.
- El root `GestureHandlerRootView` (`App.tsx`) lleva `backgroundColor: '#2d4c75'`
  (color de marca = splash) para que no corte a blanco entre splash y primer
  render.
- Cada pantalla sigue pintando `colors.bg` en su `SafeAreaView` — eso es el
  fondo real; `contentStyle` sólo cubre los frames de transición.

### ⚠️ No llames hooks con estado dentro del render-prop `children` de un `Screen`

Los `<AppStack.Screen>` aceptan un callback `children` (`{({ navigation }) => …}`).
**No pongas ahí hooks con `setState`** (`useFollowedClubs`, cargas async, etc.): React
Navigation no propaga los `setState` de ese callback al subárbol, así que la pantalla
**nunca se re-renderiza** cuando el estado cambia. Síntoma real (bug del picker de
reserva "Clubs que seguís"): el fetch resolvía (`loading=false`, 5 clubs) pero la UI
quedaba con el spinner **para siempre** porque el render no se actualizaba.

**Regla**: si un screen necesita hooks/estado, hacelo un **componente propio** (fiber
propio → `setState` re-renderiza normal) y renderízalo desde el callback:

```tsx
function ReservePickClubScreen({ navigation }: { navigation: any }) {
  const { clubs, loading } = useFollowedClubs(user?.id, fetchFollowing); // OK: fiber propio
  return <ReserveClubPickerScreen suggestedClubs={clubs} loadingSuggested={loading} … />;
}
// en el navigator:
<AppStack.Screen name="ReservePickClub">
  {({ navigation }) => <ReservePickClubScreen navigation={navigation} />}
</AppStack.Screen>
```

Es el mismo patrón que ya usan `ClubProfileScreen` y `PlayerProfileScreen`. El callback
`children` debe limitarse a leer `route.params`/`navigation` y renderizar un componente.

> **El visor también cayó en esto (2026-08-31)**: la ruta `GameDetail` llamaba
> `useGameDetail` dentro del callback, así que el `setDetail` del fetch no re-renderizaba y
> la pantalla se quedaba con `emptyGameDetail` (**`cameras: []` → sin stream**). Se veía
> **solo al entrar desde una notificación**: desde Inicio el `liveStreamUrl` viaja en
> `route.params` y ya está en el primer render, así que el `fallbackStreamUrl` tapaba la
> falla. Los comentarios sí cargaban porque solo necesitan el `gameId` de los params — por
> eso el síntoma era "comentarios sí, video no". Arreglado con `GameDetailContainer`
> (componente propio). El mismo render congelado dejaba el botón "Seguir" sin hidratar y
> "Crear highlight" nunca aparecía (el `recordingUrl` llega async).
>
> La causa exacta está en `@react-navigation/core`: `SceneView` envuelve el resultado del
> callback en **`StaticContainer`**, cuyo comparador de `React.memo` **saltea `children`
> a propósito** (`if (key === 'children') continue`). O sea: el subárbol solo se actualiza
> si cambian `render`/`navigation`/`route`; un `setState` propio jamás lo hace.

> **Todo el flujo de reserva sigue esta regla**: `ReservePickClubScreen` (club),
> `ReserveBlocksContainer` (bloques del día: canchas + slots) y `ReserveInviteScreen`
> (rivales) son componentes propios. El mismo bug hacía que **las canchas y los horarios
> no aparecieran** (el fetch resolvía pero el `setState` no re-renderizaba). Si sumás un
> paso al flujo, hacelo componente, no render-prop inline.

---

## 🚦 Convenciones al hacer cambios

### Al agregar pantallas

- Crear `screens/<Name>Screen.tsx` con `export function <Name>Screen` y
  `export interface Props`.
- Importar `useTheme()` para colores; nunca hardcodear hex.
- Wrappear con `<SafeAreaView edges={['top']}>` el contenedor raíz.
- Si es accesible desde tabs, recibir `activeTab` y `onChangeTab` como
  props y renderizar `<BottomTabBar role="..." />` al pie.
- Sumar export al barrel `screens/index.ts`.
- Sumar route al `Stack.Navigator` en `App.tsx` (con `RootStackParamList`
  actualizado).

### Al agregar componentes

- Sin lógica de negocio. Solo render. Las props determinan estado.
- Tipar con `interface` exportada (`export interface FooProps`).
- Si necesita imagen del logo, recibirla como prop `tornaLogo: any` —
  NO hacer `require()` adentro de un componente reutilizable
  (sí está OK en pantallas concretas).

### ⛔ No renderices NINGÚN ID

**Regla general: ningún identificador llega a la pantalla.** Ni UUID de partida, cancha,
reserva o highlight, ni el UID de Firebase. No le dicen nada al usuario y exponen la clave
con la que se piden esos recursos en la API.

Sitios que los mostraban, todos limpiados el 2026-08-31:

| Dónde | Qué mostraba |
|---|---|
| `GameListItem` · `CourtCard` (`components/cards.tsx`) | chip mono con `game.id` / `#court.id` |
| `UpcomingMatchSheet` | `game.id` en el header |
| `PreviewStep` (editor de video) | `gameId` al lado de cancha · club |
| `MyLibraryScreen` (highlights) | "del partido `<uuid>`" |
| `ReserveSuccessScreen` vía `MonoValue` | fila **Código** = UUID de la reserva (helper eliminado) |

Para identificar algo en la UI usá lo que el usuario reconoce: **hora · cancha · club**, o
la fecha. `fonts.mono` queda para números de cámara, timecodes y duraciones — nunca IDs.
Si alguna vez hace falta un código de reserva, tiene que ser **uno corto pensado para
leerse**, no el identificador interno.

### Al usar colores

- **Solo 3 colores**: `colors.ink` (`#2d4c75`), `colors.accent` (`#D6FF7E`),
  `#FFFFFF`.
- Neutrals = opacidades de azul (`colors.line`, `colors.muted2`, etc.).
- Texto "acento" sobre superficie neutra → `colors.accentText`.
- CTA con fondo lima → texto en `colors.primaryFg` (= `#2d4c75`).
- **Nunca**: rojo, naranja, verde diferente al lima, gradient.

### Al cambiar tokens

Editar **a la vez** los 3 sources:
- `expo/theme/tokens.ts` (RN)
- `colors_and_type.css` (web spec en raíz del proyecto)
- `ui_kits/torna-mobile/components.jsx` (el `lightT/darkT` del prototipo
  HTML)

### Al tocar fuentes

Cualquier `<Text>` nuevo debe usar `typography.*`, `manropeFont(weight)` o
`fonts.{regular,bold}` — **nunca** `fontWeight` solo.

### Al agregar assets

- Imágenes en `expo/assets/`, referenciadas con
  `require('../assets/xxx.png')`.
- PNGs bajo 200 KB idealmente.
- SVGs en runtime → componentes de `react-native-svg` (`<Svg>`, etc.).
- Si solo se usa una vez, inline en la pantalla. Si se reusa, mover a
  `components/`.

### Conectar la API real

Ya no quedan mocks de datos. Patrón vigente para sumar/usar un endpoint:

1. Cliente en `api/*.ts` (fetch con token de SecureStore, desenvuelve `{ data }`)
   y/o hook en `hooks/use*.ts` con tipo de retorno = el tipo de `data/types.ts`.
2. La pantalla recibe los datos por props; el hook se llama en el
   container/route component de `App.tsx` (o el cliente se pasa como callback,
   p. ej. `onSearchPlayers`).
3. **No** importar `api/*` ni hacer fetch directo desde una pantalla reusable —
   siempre por props; los screens son presentacionales.
4. Si el endpoint no existe todavía, la pantalla muestra **estado vacío**
   (lista vacía / "no disponible"), nunca datos inventados.

Patrón real (cliente + hook):
```ts
// api/users.ts
export function fetchUserProfile(id: string): Promise<UserProfile> {
  return authedGet<UserProfile>(`/user/profile/${id}`);
}
// hooks/useUserProfile.ts → mapea UserProfile (+ /highlights) → PlayerPublic
```

### Antes de cada commit

```bash
npx tsc --noEmit            # tipo-check
npm start                   # arranca sin warnings en Metro
```

- Verificar que toggle claro/oscuro funciona en cada pantalla nueva.
- Sin warnings de "Text strings must be rendered within a <Text>".
- Sin `colors.primary` para texto (es lima invisible sobre blanco) — usar
  `colors.accentText`.

---

## 🐛 Issues conocidos / TODO

1. **Coolvetica no shipped**. El manual pide Coolvetica Regular para H1.
   Hoy se cae a Helvetica Bold. Tarea:
   - Conseguir `Coolvetica.ttf`.
   - Colocar en `/expo/assets/fonts/`.
   - Registrar en `App.tsx` con `expo-font` `useFonts`.
   - Cambiar `fonts.display` en `tokens.ts` a `'Coolvetica'`.

2. **`GameDetailScreen` sin swipe entre cámaras**. El prototipo lo tiene
   (`ui_kits/torna-mobile/match-screen.jsx`). Tarea:
   - Replicar lógica de pointer events (mouse/touch) con
     `react-native-gesture-handler` (`Swipeable` o `PanGestureHandler`).
   - Animar el track con `transform: translateX(-camIdx * 100%)`.
   - Mantener flechas laterales como fallback.
   - Bonus: también arreglar el bug de modo claro/oscuro (header está
     hardcoded en azul oscuro; debería seguir tema).

3. ~~**`MainPlayer.profile` muestra el club profile**~~ **RESUELTO**: el tab Perfil del player usa `PlayerOwnProfileScreen` con `owner` derivado del usuario autenticado (`useAuth` + conteos reales de `useUserProfile`); incluye `MyLibraryScreen` y `PlayerSettingsScreen`.

4. **`Manrope*` removido pero `manropeFont` helper sigue ahí** por
   back-compat. Es cosmético — funciona, pero está mal nombrado. Rename a
   `helveticaFont(weight)` en próximo refactor.

5. ~~**Search overlay sin debounce**~~ **RESUELTO**: `PlayerSearchOverlay` y
   `GlobalSearchScreen` aceptan un `onSearch`/`onSearchPlayers` async que pega a
   `GET /user/search` con debounce ~300 ms; si no se provee, filtran la lista local.

6. **`MainPlayer` no se acuerda del tab activo** entre navegaciones.
   `useState<TabId>('home')` se reinicia al volver de otra ruta. Si se
   necesita persistir, mover a context o useNavigationState.

7. **No hay tests, ESLint ni Prettier configurados.** Esta es una capa
   visual; sumar al integrarse al repo final.

8. **No hay error boundaries.** Si una pantalla crashea, toda la app
   muere. Agregar `<ErrorBoundary>` por route.

9. **No hay analytics**. Sumar tracking de:
   - `login_success`, `register_submit`, `pending_view`
   - `tab_change`, `screen_view`
   - `reservation_create`, `reservation_cancel`, `match_join`
   - `follow_club`, `follow_player`

10. **HLS player** — **PARCIALMENTE RESUELTO**: `expo-av` está integrado en `GameDetailScreen`. Funciona con stream HLS real; muestra un SVG placeholder si no hay `streamUrl`. Para producción verificar soporte de DRM y bajo-latencia.

11. ~~**Mini mapa** SVG decorativo~~ → ~~Leaflet/MapTiler en WebView~~ **RESUELTO (sin mapa
    embebido)**: la ubicación se referencia con `components/MapsButton.tsx` — un botón
    "Buscar en Maps" que abre **Google Maps** (URL universal `maps/search/?api=1&query=...`)
    vía `Linking`, usando la lat/lng del club (o la dirección/nombre como fallback de
    búsqueda por texto; "Ubicación no disponible" si no hay ninguno). Se usa en
    `ClubProfilePlayerView`, `ReserveBlocksScreen` y por card de partido abierto en la
    pestaña Juegos (`GamesScreen`). Se
    eliminaron `ClubMap.tsx`, `NearbyClubsMap.tsx`, `mapTiles.ts`, la dependencia
    `react-native-webview` y la key `EXPO_PUBLIC_MAPTILER_KEY` (ya no se requiere
    dev-client para ver la ubicación).

12. ~~**Typo en `.env`**: `api.tora.io` en lugar de `api.torna.io`~~ **RESUELTO**: corregido — todas las llamadas API ahora apuntan al dominio correcto.

14. **Logs de debug de subida a B2** — `api/profile.ts` tiene logs temporales
    marcados `[UPLOAD DEBUG]` (solo `__DEV__`) para diagnosticar la subida de foto de
    perfil. **Borrarlos antes de producción.**

15. **Reserva: precio y canchas de clubs fake**. El `slot.price` sale del `pricePerBlock`
    de la cancha (0 si el club no lo configuró desde el desktop). Los clubs fake de los
    seeds no tienen canchas con `clubId` ni horario cargado, así que al reservar en ellos
    la lista de canchas sale vacía o sin slots (hay que cargar horario/`isActive`).

---

## 📚 Referencias rápidas

- Prototipo web visual: `prototype.html` (raíz del proyecto).
- CSS tokens spec: `colors_and_type.css` (raíz).
- Tipos del modelo: `data/types.ts` (solo tipos — la app no tiene mocks).
- Backend: `torna-api/CLAUDE.md` (endpoints, módulos, gotchas).
- Tests: ninguno por ahora.

Cuando trabajes con esta app:
- Diseñá primero en el prototipo HTML, validá visualmente, después portá.
- Mantené el código brand-strict (3 colores, sin gradients, Helvetica).
- Tipá TODO con interfaces exportadas; los `any` están prohibidos salvo
  para `require()` de imagen y navigation params.
- Cuando termines una pantalla, agregá su entry al barrel
  (`screens/index.ts`) y su route a `App.tsx`.
