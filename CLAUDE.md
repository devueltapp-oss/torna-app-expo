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
  **buscar partido cerca tuyo** (GPS).
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
- `SearchPlayScreen` — descubrimiento por GPS:
  1. Permission gate con explicación y bullets.
  2. Mini-mapa + radio pill + tabs Canchas/Jugadores.
  3. Botón **Reservar** (canchas) o **Unirme** (jugadores).
- Flujo de reserva en 3 pasos (`ReserveStep1` → `Step2` → `Step3` →
  `ReserveSuccess`):
  1. Elegir cancha (radio buttons sobre las canchas del club).
  2. Día (chips horizontales) + slot (grid 2×N con estado/precio/cámara).
  3. **Switch "Buscar rivales"**:
     - OFF: el player + 1 compañero **obligatorio** + 2 rivales.
     - ON: el player + 1 compañero. El partido se publica para que 2 más
       se sumen.
     - **Cambiar** abre `PlayerSearchOverlay` (autofocus + filter local).
- `JoinMatchScreen` — para players que tocan "Unirme" sobre un nearby
  player en "Buscar rivales" mode. Switch "Voy con compañero".
- **Reservar ahora, pagar en el club.** NO hay pago en la app.
- `PlayerOwnProfileScreen` — perfil propio del player: avatar, stats (seguidores / siguiendo / partidos / highlights), 3 tabs (Highlights / Partidos / Fotos), grid 3×N de contenido. Accesos a `MyLibraryScreen` y `PlayerSettingsScreen`.
- `MyLibraryScreen` — librería privada (solo el dueño la ve): 3 secciones colapsables (Mis partidos completos → acción "Crear highlight", Mis highlights con toggle Privado/Público, Mis subidas con foto/video ≤3 min). FAB "+" abre `UploadSheet`.
- `VideoEditorScreen` — flujo de 5 pasos para crear highlight desde una grabación de partido: Preview → Trim (`TrimRangeSlider`) → Metadata (título + visibilidad) → Procesando (`ffmpeg-kit`) → Resultado.

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

Tipos exportados desde `data/mocks.ts`. Cuando el backend exponga la API,
estos tipos no cambian — solo se reemplaza el `MOCK_*` por una llamada
real (idealmente envuelta en un hook de RTK Query / TanStack Query).

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

// Search play (GPS)
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
2. `mode='search-opponents'` solo requiere booker + partner; los 2 rivales
   llegan por `POST /reservations/:id/join` cuando otros se suman.
3. El precio se muestra pero NO se cobra. `payment.status='pending'` hasta
   que el club marca como cobrado (en su admin panel externo).
4. Slots `reserved` están bloqueados; slots `own` (verdes) son del usuario
   actual — al tocarlos, abrir la reserva existente en lugar de crear una.
5. GPS se solicita **on-demand**, solo cuando se abre `SearchPlayScreen`.

---

## 🔌 API esperada (contratos del backend)

Endpoints que el backend tiene que exponer. Cuando estén listos, sustituir
las `MOCK_*` por hooks reales.

### Auth

```
POST /auth/login-email-password  { email, password } → { token, user: TornaUser }
POST /auth/login                 { idToken: string } → { token, user: TornaUser }
                                                      | { status: 'needs_registration', idToken }
POST /auth/register              { idToken, username, name, authProvider } → { token, user: TornaUser }
GET  /auth/me                    Bearer token → TornaUser
DELETE /auth/logout              → 204
```

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

`HomeScreen` consume `GET /game/live` vía el hook `hooks/useLiveGames.ts`
(mapea la respuesta del backend → `LiveGameData`). El contenedor `MainPlayer`
en `App.tsx` cae a `MOCK_LIVE_GAMES` si la lista real viene vacía (login de dev
sin token, o sin partidas en vivo de tus seguidos).

### Feed (club admin)

```
GET /clubs/:id/dashboard     → { liveCount, courtsTotal, viewers, viewersDelta, pendingPayments }
GET /clubs/:id/today         → ClubTodayReservation[]
```

### Club público (POV player)

```
GET    /clubs/:id            → ClubPublic
GET    /clubs/:id/highlights → { live: Game[], clips: Clip[] }
GET    /clubs/:id/upcoming   → Game[]   (status='SCHEDULED')
GET    /clubs/:id/members    → DirectoryPlayer[]
GET    /clubs/:id/photos     → Photo[]
POST   /clubs/:id/follow     → { isFollowing: true,  followers }
DELETE /clubs/:id/follow     → { isFollowing: false, followers }
```

### Player público

```
GET    /players/:id          → PlayerPublic
POST   /players/:id/follow   → { isFollowing: true }
DELETE /players/:id/follow   → { isFollowing: false }
POST   /players/:id/invite   { reservationDraftId?, message? } → 200
```

### Canchas y reservas

```
GET    /courts/:id/slots?date=YYYY-MM-DD → Slot[]
POST   /reservations  { courtId, date, slotStart, partnerUserId, mode,
                        opponents? } → 201 Reservation
DELETE /reservations/:id      → 204   (>4h antes; sino 409)
POST   /reservations/:id/join { mode: 'solo'|'with-partner',
                                partnerUserId? } → 200 Reservation
GET    /players?q=&clubId=    → InvitablePlayer[]   (para overlay search)
```

### Search play (GPS)

```
GET /search/nearby?lat=&lng=&radius= → { courts: NearbyCourt[], players: NearbyPlayer[] }
```

### Game detail (visor HLS)

```
GET  /games/:id              → GameDetail (con cameras[])
GET  /games/:id/comments     → Comment[]
POST /games/:id/comments     → Comment
```

> Nota: la app **NO** crea ni edita Courts, Slots ni Cameras. Esos
> endpoints son de **lectura solamente** desde la app. El admin externo es
> el único escritor.

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
| **Video / HLS** | `expo-av` ~14.0.7 (reproductor HLS) |
| **Gestos** | `react-native-gesture-handler` ~2.16.1 (swipe entre cámaras, editor) |
| **Fuentes** | `expo-font` ~12.0.0 (carga de .ttf custom) |
| **Procesamiento de video** | `ffmpeg-kit-react-native` ^6.0.2 (trim de highlights — **solo production build**, no incluir en `package.json` para dev; incompatible con el config plugin de Expo en Node moderno) |
| **Splash / icon** | `assets/torna-icon.png` (1024×1024) · fondo `#2d4c75` |
| **Bundle IDs** | iOS: `io.torna` · Android package: `io.torna` |
| **Auth** | `@react-native-firebase/auth` v24 · `@react-native-google-signin` · `expo-apple-authentication` |
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
│   └── ApplyMatchSheet.tsx      # solicitar unirse a partido abierto
├── screens/
│   ├── LoginScreen.tsx
│   ├── LoginWithRoleScreen.tsx
│   ├── RegisterClubScreen.tsx
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
│   ├── useOwnMedia.ts       # fetch /media/my, retorna photos/videos con refresh
│   └── useFollow.ts         # follow/unfollow con optimistic update
├── api/
│   ├── highlights.ts        # createHighlightApi · listSavedHighlights
│   └── video.ts             # upload helpers + presigned URL
├── services/
│   └── highlightService.ts  # orquestación: trim → upload → index
└── data/
    └── mocks.ts            # MOCK_* + tipos públicos (ClubPublic, NearbyCourt, etc.)
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
| `SearchPlay` | Discovery GPS | player | — |
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

Cuando un endpoint esté listo:

1. Crear hook `hooks/useFoo.ts` con tipo de retorno = el tipo del mock.
2. La pantalla recibe los datos por props; el hook se llama en el
   container/route component de `App.tsx`.
3. **No** importar mocks directamente desde la pantalla — siempre por props.
4. Borrar el `MOCK_*` correspondiente solo cuando el hook esté probado.

Patron sugerido (TanStack Query):
```ts
// hooks/useClubPublic.ts
export function useClubPublic(id: string) {
  return useQuery({
    queryKey: ['club', id],
    queryFn: () => api.get<ClubPublic>(`/clubs/${id}`).then(r => r.data),
  });
}
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

3. ~~**`MainPlayer.profile` muestra `MOCK_PROFILE`** que es club profile.~~ **RESUELTO**: el tab Perfil del player ahora usa `PlayerOwnProfileScreen` con `MOCK_OWNER`; incluye `MyLibraryScreen` y `PlayerSettingsScreen`.

4. **`Manrope*` removido pero `manropeFont` helper sigue ahí** por
   back-compat. Es cosmético — funciona, pero está mal nombrado. Rename a
   `helveticaFont(weight)` en próximo refactor.

5. **Search overlay sin debounce**. `PlayerSearchOverlay` filtra
   localmente en cada keystroke. Cuando se conecte la API real
   (`GET /players?q=`), agregar debounce (~300 ms).

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

11. **Mini mapa** en `SearchPlayScreen` y `ClubProfilePlayerView` es un
    SVG decorativo. Reemplazar con `react-native-maps` (o `mapbox-gl`).
    El espacio reservado (132px alto en SearchPlay, 120px en
    ClubProfile) ya tiene las dimensiones correctas.

12. **`torna-logo.svg`** en assets no se usa en runtime — borrarlo o
    convertirlo a componente RN-SVG.

13. ~~**Typo en `.env`**: `api.tora.io` en lugar de `api.torna.io`~~ **RESUELTO**: corregido — todas las llamadas API ahora apuntan al dominio correcto.

---

## 📚 Referencias rápidas

- Prototipo web visual: `prototype.html` (raíz del proyecto).
- CSS tokens spec: `colors_and_type.css` (raíz).
- CLAUDE.md general (raíz): visión de producto y reglas.
- Mocks de datos: `data/mocks.ts` (con tipos).
- Tests: ninguno por ahora.

Cuando trabajes con esta app:
- Diseñá primero en el prototipo HTML, validá visualmente, después portá.
- Mantené el código brand-strict (3 colores, sin gradients, Helvetica).
- Tipá TODO con interfaces exportadas; los `any` están prohibidos salvo
  para `require()` de imagen y navigation params.
- Cuando termines una pantalla, agregá su entry al barrel
  (`screens/index.ts`) y su route a `App.tsx`.
