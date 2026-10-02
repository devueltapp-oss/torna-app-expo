# Enlace GoPro desde usuarios club

Entrada: Inicio / Juegos → Iniciar partida · preparar cámaras → Conectar cámara. La ruta solo se registra para `user.isClub === true`.
El contenedor, el servicio BLE y el cliente API vuelven a validar ese rol. Los jugadores
no tienen entrada ni ruta y nunca inicializan el módulo nativo Bluetooth.

La cámara debe existir en Desktop con `bleName` (cuatro dígitos). El móvil lista las
cámaras con `GET /camera` autenticado, confirma la pertenencia antes de enlazar y antes
de guardar, y usa el contrato existente `PUT /camera/:id/cohn`:
`{ ipAddress, username, password, certificate }`.
El backend debe seguir comprobando rol club y propiedad por token en ambos endpoints;
las guardas del cliente no sustituyen la autorización del servidor. No se ha modificado
ni auditado el backend en este cambio, porque ese repositorio no está disponible aquí.

## Flujo

- BLE: buscar exactamente GoPro + sufijo; conectar; emparejar en Android / aceptar el
  diálogo del sistema en iOS; suscribirse a las respuestas.
- Sincronizar fecha, buscar WiFi, conectar a una red nueva o guardada según sus flags.
- Consultar COHN y crear el certificado únicamente si todavía no está provisionado.
  No se borra ni rota un certificado existente.
- Esperar red conectada, obtener credenciales y guardarlas en Torna. Si falla la subida,
  la pantalla ofrece reintentar sin repetir Bluetooth. Los datos quedan solo en memoria
  hasta guardar o salir; al volver a enlazar se recupera el certificado de la cámara.
- Se cancela al salir de la pantalla, cerrar sesión o pasar a segundo plano; se liberan
  suscripciones, escaneo y conexión. Se permite una operación por teléfono.

Las contraseñas y certificados no se muestran ni se escriben en logs. La contraseña
del WiFi se envía a la cámara; al backend solo se envían las credenciales COHN.

Android puede previsualizar directamente la GoPro por UDP mediante expo-video / Media3.
El módulo local TornaCohn solo acepta IP privadas y comandos HTTPS de estado, inicio/fin de preview
y keep-alive; valida el certificado exacto obtenido por BLE, sin modificar la confianza TLS global.
La vista cierra al salir o pasar a segundo plano. BLE y preview comparten una exclusión local hasta
terminar su limpieza. Se comprueba que la cámara no pertenezca a otra partida LIVE antes de abrirla.
POST /game/:id/start-stream adjunta cámaras a una reserva, sin marcar LIVE. La recepción de un
primer frame confirma el preview; no se usa RTMP ni se marca una transmisión como iniciada.
Este receptor UDP está implementado para Android. iOS conserva el enlace BLE y explicita que no
tiene preview local. Desktop sigue realizando el reenvío RTMP; móvil puede ver el HLS existente.
El operador debe detener preview/transmisión antes de cambiar el WiFi de una cámara:
el bloqueo local de Desktop no coordina operaciones desde otro dispositivo.

## Compilación y validación

Se agregó `react-native-ble-manager` 12.5.3 y su plugin de Expo. Requiere nueva compilación
nativa Android/iOS; no funciona en Expo Go ni se instala mediante OTA. El hardware BLE no
es obligatorio para instalar Torna (los jugadores no necesitan esta función).

Ejecutar `npx tsc --noEmit` y `npm test -- --runInBand`. Validar en un teléfono físico:
rol player sin entrada; club con lista propia; permisos denegados; emparejamiento;
WiFi nueva y guardada; contraseña incorrecta; cancelar; reintentar guardado sin Internet;
finalmente preview Android en la misma LAN y alternar dos cámaras cerrando la anterior. La validación simulada no demuestra
compatibilidad con el firmware de una GoPro concreta.

Fuentes: [Open GoPro COHN](https://gopro.github.io/OpenGoPro/docs/ble/cohn/),
[protocolo BLE](https://gopro.github.io/OpenGoPro/docs/ble/protocol/data_protocol/),
[network_management.proto](https://github.com/gopro/OpenGoPro/blob/main/protobuf/network_management.proto),
[cohn.proto](https://github.com/gopro/OpenGoPro/blob/main/protobuf/cohn.proto),
[BLE Manager](https://innoveit.github.io/react-native-ble-manager/methods/).

Referencias del receptor: https://docs.expo.dev/versions/v55.0.0/sdk/video/ y https://github.com/androidx/media/blob/release/libraries/datasource/src/main/java/androidx/media3/datasource/DefaultDataSource.java

## Conexión Bluetooth explícita

En Preparar partida, «Conectar cámara por Bluetooth» solicita permisos Android de Dispositivos cercanos (SCAN/CONNECT en Android 12+, ubicación en versiones anteriores), escanea, conecta, empareja y suscribe los servicios GoPro. Solo entonces muestra Bluetooth conectado. La sesión se conserva para configurar WiFi sin repetir la conexión. Si ya existe COHN conectado, Previsualizar recupera sus credenciales por BLE y cierra BLE antes de abrir UDP. Salir, pasar a segundo plano, cancelar o cambiar de cámara cierra la sesión. Android no vuelve a mostrar el diálogo si los permisos ya fueron otorgados; si fueron bloqueados, la interfaz ofrece abrir ajustes.

## Transmisión nativa (RTMP directo de la cámara, 2026-10-03)

El botón de previsualización ("Cerrar preview e iniciar transmisión") cierra el preview
local y arranca el livestream nativo de la GoPro: la cámara empuja RTMP a Wowza por su
propia cuenta, por WiFi, sin pasar por el teléfono ni por ffmpeg. `services/cohn/liveStream.ts`
implementa esto reutilizando el mismo transporte BLE de COHN (`services/cohn/bluetooth.ts`,
`protocol.ts`), con el comando protobuf `SET_LIVESTREAM_MODE` (feature `COMMAND`=0xF1,
acción 0x79) seguido del disparador `SET_SHUTTER` (TLV, 0x01) — **no** inicia nada hasta
confirmar `LIVE_STREAM_STATE_STREAMING` por la notificación `NotifyLiveStreamStatus`
(`QUERY`=0xF5). Solo entonces el móvil llama `PUT /game/live/:id/start`, el mismo endpoint
que usa Desktop, que es quien dispara `STREAMING_STARTED` hacia los seguidores — así que
nunca se notifica a nadie de una transmisión que no está confirmada.

Cada paso, constante de tiempo y el orden exacto de comandos están portados de
`legacy-ble/python/native_stream.py` (torna-desktop), la única implementación **verificada
contra hardware real** (HERO12, open_gopro 0.17.1) de este camino — incluida la espera de
15s entre `READY` y el disparador, y el hecho de que el ack del disparador de encendido
puede no llegar nunca aunque la cámara sí empiece a transmitir (se confirma por la
notificación de estado, no por el ack). El origen de la URL RTMP y el perfil de encoding
(resolución/lente/bitrates) es `Camera.rtmpServer`/`resolution`/`lens`/`minBitRate`/
`maxBitRate`/`startingBitRate` — las mismas columnas que ya usa Desktop para su propio
pipeline de ffmpeg, leídas tal cual de `GET /game/:id/cameras`; el móvil no las edita.

⚠️ No se mantiene la conexión Bluetooth abierta más allá de lo que ya hace esta pantalla:
al confirmarse `STREAMING` se recarga la partida (ahora `LIVE`) y de ahí en más rige el
mismo ciclo de vida que cualquier partida en vivo (ver "Finalizar una partida EN VIVO" en
`torna-app-expo/CLAUDE.md`) — salir de la pantalla cierra BLE como con cualquier otra
acción de esta vista. No se verificó contra hardware real si la cámara sigue transmitiendo
tras ese cierre; se asume que sí porque el RTMP corre por WiFi, no por BLE, pero esto no
reemplaza una prueba con una GoPro física antes de usarlo en producción.
