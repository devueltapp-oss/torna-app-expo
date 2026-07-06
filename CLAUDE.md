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
- `SearchPlayScreen` — **partidos abiertos para sumarse** (GET /game/open vía
  `useOpenGames`). **Sin GPS ni permiso de ubicación.** Lista cada partido con
  hora/cancha/club, cupo (X/4) y jugadores; cada card tiene **"Ver detalle"**
  (abre `UpcomingMatchSheet` → postularse/aceptar vía `POST /game/:id/apply`) y
  **"Buscar en Maps"** (`MapsButton`, abre Google Maps fuera de la app — pin
  exacto con lat/lng del club si está, o búsqueda por nombre; siempre sin
  permiso). Pull-to-refresh; estado vacío si no hay partidos.
- Flujo de reserva en 3 pasos (`ReserveStep1` → `Step2` → `Step3` →
  `ReserveSuccess`):
  1. Elegir cancha (radio buttons sobre las canchas del club).
  2. Día (chips horizontales) + slot (grid 2×N con estado/precio/cámara).
  3. **Switch "Buscar rivales"**:
     - OFF: el player + 1 compañero **obligatorio** + 2 rivales.
     - ON: el player + 1 compañero. El partido se publica para que 2 más
       se sumen.
     - **Cambiar** abre `PlayerSearchOverlay` (autofocus + filter local).
- Sumarse a un partido abierto: desde `SearchPlayScreen` → "Ver detalle" →
  `UpcomingMatchSheet` → **Postularme** (`POST /game/:id/apply`, con switch "voy con
  compañero"). (`JoinMatchScreen` es legacy y ya no tiene ruta en `App.tsx`.)
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
Slot { start, end, duration: 60|90, price, status: 'free'|'reserved'|'own', cams }
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

**Reglas de negocio que el frontend respeta:**

1. Partner es **siempre obligatorio** en reservas — debe existir en la app.
2. La reserva se crea con `POST /game/reserve` (una `Game` SCHEDULED sin cámaras).
   `mode='search-opponents'` marca `isOpenForPlayers=true` para que otros 2 se sumen.
3. El precio se muestra pero NO se cobra (hoy el slot devuelve price 0); el pago es
   en el club.
4. Slots `reserved` están bloqueados (solapan una Game existente de esa cancha).
5. **Sin GPS.** `SearchPlayScreen` ya no pide permiso de ubicación: lista partidos
   abiertos (GET /game/open) y la ubicación de cada uno se abre en Google Maps fuera
   de la app (`MapsButton`).
6. **Ubicación estática solo en clubs**: el mapa usa `latitude/longitude` del club
   (`isClub=true`); el player no tiene ubicación persistida (su GPS es runtime).

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

> El botón **"Crear cuenta de Player"** de `LoginWithRoleScreen` navega a
> `RegisterPlayer` (`App.tsx`); el de club va a `Register`. El username se valida
> en vivo contra `GET /auth/check-username?username=` (debounce 400 ms).

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
GET /user/search?q=     → jugadores (GlobalSearchScreen + overlay de invitar)
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
GET  /padel-court?clubId=            → canchas del club (ReserveStep1)
GET  /padel-court/:id                → una cancha
GET  /padel-court/:id/slots?date=    → Slot[] del día (ReserveStep2)
POST /game/reserve  { courtId, date, slotStart, durationMinutes, mode,
                      partnerUserId?, opponentUserIds? } → crea la partida (ReserveStep3)
```

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

> **Equipos**: cada `GamePlayer` trae `team` (1 = lado owner, 2 = pareja retadora). El tab
> **Juegos** del player muestra "Mis partidas" (`useMyGames`); tocar una abre `UpcomingMatchSheet`
> que, según el rol del viewer, ofrece *Cancelar partida* (owner), *Darme de baja* (miembro) y
> *Cancelar nuestra pareja* (team 2). Las bajas/cancelaciones notifican por push (OneSignal).

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

> Nota: la app **NO** crea ni edita Courts, Slots ni Cameras. Esos
> endpoints son de **lectura solamente** desde la app. El admin externo es
> el único escritor.

### Notificaciones push (OneSignal)

La app usa **`react-native-onesignal`** (NO `expo-notifications`). Init en `App.tsx`
dentro de `App()`: `OneSignal.initialize(EXPO_PUBLIC_ONESIGNAL_APP_ID)` +
`requestPermission` + listener de `click`.

```
PUT /user/update-notification-id  { notificationID }  → registra el push token
```

- `registerNotificationId()` en `contexts/AuthContext.tsx` se llama tras cada login
  (email / Google / Apple). Toma el subscription ID de OneSignal
  (`OneSignal.User.pushSubscription.getIdAsync()`) y lo manda al backend.
- ⚠️ **El campo DEBE ser `notificationID` (con `ID` mayúscula)** para coincidir con el
  DTO del backend (`forbidNonWhitelisted`); un `notificationId` con `d` minúscula da
  **400** y el token nunca se registra → no llega ningún push. El registro es
  best-effort (catch silencioso), así que el fallo es invisible.
- El listener de `click` lee `additionalData`; si `type === 'STREAMING_STARTED'` y hay
  `gameId`, navega a `GameDetail`. Hoy ese es el único tipo manejado (lo dispara el
  backend cuando una partida pasa a LIVE desde torna-desktop).
- Env: `EXPO_PUBLIC_ONESIGNAL_APP_ID`. La app **solo recibe** push; no hay WebSocket ni
  polling en tiempo real (los datos se refrescan al montar o con pull-to-refresh).

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
| **Video / HLS** | `expo-av` ~14.0.7 (reproductor HLS). **Fullscreen**: `GameDetailScreen`, `ReelViewScreen` y el `Player` del editor usan el nativo `videoRef.current.presentFullscreenPlayer()` sobre la misma instancia (NO un `Modal` con un segundo `<Video>`); botón `Maximize2`. **Excepción — `VideoPreviewModal`**: usa pantalla completa **in-app** (estado `expanded`, misma instancia de `<Video>`) en vez del nativo, para poder superponer el panel de comentarios (botón flotante "Comentarios (N)" → `showCommentsPanel`) |
| **Mapas** | Sin mapa embebido ni librería de mapas. La ubicación se referencia con un botón **"Buscar en Maps"** (`components/MapsButton.tsx`) que abre **Google Maps** (URL universal `maps/search/?api=1&query=lat,lng`) vía `Linking`. Antes había Leaflet en `react-native-webview` + MapTiler; se quitó para no requerir dev-client ni API key |
| **Ubicación** | Sin GPS. Las ubicaciones se abren en **Google Maps** vía `MapsButton` (`Linking`), usando lat/lng del club (pin exacto) o el nombre como fallback. `expo-location` y el hook `useLocation` fueron **eliminados** (también el permiso `NSLocationWhenInUse` de `app.json`) |
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
│   ├── racket.png          # EmptyState ilustración
│   └── torna-logo.svg      # decorativo (no usado en runtime — borrable)
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
│   ├── LoginScreen.tsx
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
│   ├── SearchPlayScreen.tsx
│   ├── GlobalSearchScreen.tsx      # búsqueda global de players/courts por texto
│   ├── JoinMatchScreen.tsx
│   ├── ReserveStep1Screen.tsx       # elegir cancha
│   ├── ReserveStep2Screen.tsx       # día + slot
│   ├── ReserveStep3Screen.tsx       # players + confirmar
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
│   └── useUserProfile.ts    # GET /user/profile/:id + /highlights?userId= → PlayerPublic
├── api/
│   ├── users.ts            # fetchUserProfile · searchUsers
│   ├── clubs.ts            # fetchNearbyClubs · fetchClubCourts · fetchCourt · fetchCourtSlots · createReservation
│   ├── games.ts            # fetchMyGames · applyToGame · accept/rejectApplication · cancelGame · leaveGame · cancelChallengerPair
│   ├── highlights.ts       # fetchUserHighlights · fetchMyHighlights · createHighlightFromRecording (POST /highlights/from-recording)
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
| `Login` | Login legacy (solo club) | club | — |
| `Register` | Alta de club | club | — |
| `Pending` | Aprobación pendiente | club | — |
| `CompleteProfile` | Completar perfil (social) | ambos | `{ idToken: string }` |
| `MainPlayer` | Tabs internos player | player | — |
| `MainClub` | Tabs internos club | club | — |
| `GameDetail` | Visor HLS | ambos | `{ gameId }` |
| `ClubProfile` | Perfil público del club | player | `{ clubId }` |
| `PlayerProfile` | Perfil público de un player | player | `{ playerId }` |
| `SearchPlay` | Partidos abiertos para sumarse (sin GPS) | player | — |
| `ReserveCourt` | Paso 1 — elegir cancha | player | `{ clubId, courtId? }` |
| `ReserveTime` | Paso 2 — fecha + slot | player | `{ courtId }` |
| `ReserveInvite` | Paso 3 — switch + players | player | `{ courtId, date, slot }` |
| `ReserveOk` | Confirmación | player | `{ reservationId }` |
| `VideoEditor` | Editor de highlight (5 pasos) | player | `{ matchId, clipData }` |

### Bottom tab bar (role-aware)

`BottomTabBar` recibe `role: 'club' | 'player'`. **Inicio está centrado en
ambos**.

| Rol | Tabs |
|---|---|
| **club** (5) | Canchas · Juegos · **Inicio** · Jugadores · Perfil |
| **player** (5) | Juegos · 🔍 Buscar · **Inicio** · Jugadores · Perfil |

El tab `search` (player-only) **navega** a `SearchPlay` en lugar de cambiar
el contenido (ver `MainPlayer.handleTab` en `App.tsx`).

El componente NO es `@react-navigation/bottom-tabs` — es estado local en
`MainPlayer` / `MainClub`. Esto permite layouts custom por tab.

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
    `ClubProfilePlayerView`, `ReserveStep1Screen` y por card en `SearchPlayScreen`. Se
    eliminaron `ClubMap.tsx`, `NearbyClubsMap.tsx`, `mapTiles.ts`, la dependencia
    `react-native-webview` y la key `EXPO_PUBLIC_MAPTILER_KEY` (ya no se requiere
    dev-client para ver la ubicación).

12. **`torna-logo.svg`** en assets no se usa en runtime — borrarlo o
    convertirlo a componente RN-SVG.

13. ~~**Typo en `.env`**: `api.tora.io` en lugar de `api.torna.io`~~ **RESUELTO**: corregido — todas las llamadas API ahora apuntan al dominio correcto.

14. **Logs de debug de subida a B2** — `api/profile.ts` tiene logs temporales
    marcados `[UPLOAD DEBUG]` (solo `__DEV__`) para diagnosticar la subida de foto de
    perfil. **Borrarlos antes de producción.**

15. **Reserva: precio y canchas de clubs fake**. El slot devuelve `price: 0` (no hay
    fuente de precio en el modelo). Los clubs fake de los seeds no tienen canchas con
    `clubId`, así que al reservar en ellos la lista de canchas sale vacía.

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
