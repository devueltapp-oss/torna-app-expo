# TestFlight — distribución iOS y loop de feedback

Guía operativa para publicar builds en TestFlight, iterar con feedback de testers
y no volver a perderse entre registros/bundle IDs.

---

## 1. Identidades (la fuente de verdad)

> ⚠️ Hay **dos** registros "Torna" en App Store Connect. Usar SIEMPRE el primero.

| Qué | Valor |
|---|---|
| **App Store Connect — app real** | "Torna", **Apple ID `6752793193`**, bundle **`com.Tornapp`** (T mayúscula) |
| Registro accidental (a borrar) | "Torna (45d4ad)", Apple ID `6808480694`, bundle `io.torna` — lo creó un `eas submit` temprano. **No se usa.** Borrar con App Information → Remove App |
| **Bundle ID iOS** | `com.Tornapp` — App ID "XC com Tornapp" en el Apple Developer Portal. **No se puede cambiar** (está horneado en el registro de ASC) |
| Extensión OneSignal | `com.Tornapp.OneSignalNotificationServiceExtension` |
| App Group | `group.com.Tornapp.onesignal` — tiene que estar **asociado** (no solo la capability tildada) a los dos App IDs |
| Apple Team | `AV8QDAJJY9` — TORNA GROUP INT LLC |
| Provider | `128087824` |
| Android package | `io.torna` (Play es otra migración, no tocar por ahora) |
| Expo project | `@teamtornas-organization/tornapp`, projectId `6a3a7eab-f27e-4225-989f-4331a6fc578e` |

### Servicios atados al bundle ID `com.Tornapp`

| Servicio | Detalle |
|---|---|
| **Firebase** | Proyecto `torna-7a62f`. App iOS `com.Tornapp` → `GoogleService-Info.plist` en la raíz del repo. Trae el `REVERSED_CLIENT_ID` para el URL scheme de Google Sign-In (lo lee el plugin `@react-native-google-signin` solo). ⚠️ La app Firebase `com.tornapp` (minúscula) del mismo proyecto **no sirve** |
| **OneSignal** | App `055f57fd-c4da-43e8-bab7-c1aa3712abd3`. Settings → Push & In-App → Apple (APNs): **Bundle ID `com.Tornapp`** + APNs **.p8 Auth Key** (Key ID `UA2GM4P8RT`, Team `AV8QDAJJY9`). La .p8 es a nivel equipo — guardarla fuera del repo, no se puede re-descargar |
| **APNs** | Auth Key `.p8` creada en Apple Developer → Keys. Sirve para cualquier bundle ID del equipo, no expira |

### Agreements (App Store Connect → Business)

- **Free Apps Agreement: Active** ✅ — es el que importa (Torna es gratis, sin compras in-app).
- Paid Apps Agreement vencido: **irrelevante** salvo que se cobre la app o se metan suscripciones.

---

## 2. Credenciales de build (las maneja EAS)

- **Distribution Certificate + Provisioning Profiles**: EAS los genera/rota solo en `eas build` cuando te logueás con Apple. Si un profile quedó inválido (p. ej. se agregó una capability después), EAS lo detecta y ofrece regenerar → responder **yes**.
- **App Store Connect API Key** para `eas submit`: Key ID `4933J62Y33` (`[Expo] EAS Submit …`), guardada en los servers de EAS. Por eso `eas submit` va sin pedir contraseña.
- Ver/editar todo: `npx eas-cli credentials -p ios`.

---

## 3. Versionado (remoto + autoIncrement)

`eas.json` → `cli.appVersionSource: "remote"` y `build.production.autoIncrement: true`.

- **`version`** (marketing, ej. `1.2.0`) sale de `app.json` → `expo.version`. Se sube a mano cuando querés marcar un hito.
- **`buildNumber`** lo lleva EAS en su server y lo **sube solo** en cada build de `production`. No está en `app.json`.
- Sembrado inicial (una vez, ya hecho para llegar a 8):
  ```
  npx eas-cli build:version:set --platform ios
  ```
- Consultar el actual: `npx eas-cli build:version:get --platform ios`.

---

## 4. Loop de iteración

```bash
# 1. hacés el fix
# 2. build (autoIncrement bumpea el buildNumber solo: 9, 10, 11…)
npx eas-cli build --platform ios --profile production
# 3. submit al registro "Torna" (6752793193) — no pide nada
npx eas-cli submit --platform ios --profile production --latest
# 4. Apple procesa ~5-15 min → aparece en TestFlight
```

- **No se toca `app.json` entre iteraciones.**
- Con **"Automatically distribute new builds"** activado en el grupo, cada build les llega a los testers sin que hagas nada más.
- Una `version` (p. ej. `1.2.0`) aguanta muchos builds (8, 9, 10…). Solo cambiás el string de `version` para un hito.

---

## 5. Setup de TestFlight (una vez)

App Store Connect → **Torna** → **TestFlight**.

### 5.1. Test Information (obligatorio para externo, recomendado siempre)

- **Beta App Description** — qué es la app y qué se espera que prueben.
- **Feedback Email** — a dónde llegan los comentarios de los testers.
- **Marketing URL / Privacy Policy URL** — `https://torna.io/…` (la de privacidad es obligatoria para testing externo).
- **Contact info** — nombre / email / teléfono.
- **Sign-In required → Sí** → cuenta demo: `tornaaple@yopmail.com` / `Torna2025!` + nota:
  > Para probar: primero entrar al panel del club para iniciar una partida y habilitar la transmisión; después el visor la muestra en la app.

### 5.2. Internal Testing (inmediato, sin review de Apple)

1. **Users and Access** → invitar gente con cualquier rol (Developer / Marketing / Customer Support / etc.).
2. TestFlight → **Internal Testing** → grupo (ya existe **"Team (Expo)"**) → agregar testers → asignar el build.
3. Activar **"Automatically distribute new builds"** en el grupo.
4. Límite 100 testers. Builds disponibles ~90 días.

### 5.3. External Testing (feedback amplio, con Beta App Review)

1. TestFlight → **External Testing** → grupo nuevo (ej. "Beta") → agregar el build.
2. Apple hace un **Beta App Review** (más liviano que el del App Store; ~24-48 h la primera vez de cada `version`). Builds siguientes de la misma `version` suelen auto-aprobarse rápido.
3. Aprobado → **Enable Public Link** → cualquiera con el link entra (hasta 10.000). O agregar testers por email.
4. Completar **"What to Test"** por build.

---

## 6. Dónde llega el feedback

- El tester, desde la app **TestFlight**: screenshot o zarandear el teléfono → **"Share Beta Feedback"** (manda screenshot + nota).
- Vos lo ves en **App Store Connect → Torna → TestFlight → Feedback** (screenshots + notas) y **Crashes** (stack traces simbolicados).
- Copia al **Feedback Email** de Test Information.

---

## 7. Gotchas ya resueltos (para no repetirlos)

| Síntoma | Causa | Fix |
|---|---|---|
| `90055: bundle identifier cannot be changed from 'com.Tornapp'` | Se subió un binario `io.torna` al registro `com.Tornapp` (o `--latest` agarró un build viejo) | Buildear con `bundleIdentifier: com.Tornapp`; verificar con `eas build:list` que `--latest` sea el build correcto |
| `provisioning profile doesn't support the group.com.Tornapp.onesignal App Group` | El App Group no estaba **asociado** al App ID de la extensión (tildar la capability ≠ asignar el grupo) | Apple Developer → Identifiers → cada App ID → Edit → App Groups → **Configure** → tildar `group.com.Tornapp.onesignal` → Save. Después regenerar profiles (`eas credentials` o borrar los `*[expo] com.Tornapp*` en Profiles y rebuildear) |
| `include of non-modular header inside framework module 'RNFBApp…'` | `@react-native-firebase` + `useFrameworks: static` + clang de Xcode 26 | Config plugin `plugins/withNonModularHeaders.js` (ya en `app.json`) inyecta `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` |
| `Expo SDK X is not compatible with Xcode 26` / `cannot find 'TARGET_IPHONE_SIMULATOR'` | Toolchain de EAS más nuevo que el SDK | SDK ≥ 55 compila en Xcode 26; **no** fijar `image` a Xcode 16 (Apple rechaza esos binarios desde 28/4/2026) |
| Ícono "desalineado" en iOS / rechazo por canal alfa | Ícono con esquinas redondeadas horneadas + transparencia | `assets/icon.png` = 1024×1024 **opaco**, cuadrado, sin redondear; iOS aplica su máscara |
| Build sin ícono en App Store Connect | Todavía "Procesando" | Esperar a "Listo para probar"; el ícono aparece al terminar |

---

## 8. Pendiente

- [ ] Smoke test en device de la 1.2.0 (8): login email/**Google**/**Apple**, **push** (abierta y cerrada), **stream HLS** + swipe de cámaras + destrabe, **editor de video → Trim** (filmstrip, `react-native-create-thumbnail` — único sin garantía New Arch), navegación general.
- [ ] Merge `feat/expo-sdk-55` → `main`.
- [ ] Borrar el registro "Torna (45d4ad)" (Apple ID 6808480694).
- [ ] Release público: crear `version` nueva en la pestaña App Store, adjuntar build, y resolver el rechazo previo (**2.3.6** metadata + **5.1.1** App Privacy). Es trabajo de contenido/legal, no de build.
