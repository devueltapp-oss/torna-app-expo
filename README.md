# Torna · App móvil (Expo / React Native)

App **iOS + Android** del producto. **TypeScript estricto**. Brand-strict
3 colores (`#2d4c75` + `#D6FF7E` + `#FFFFFF`).

📖 **Toda la documentación está en [`CLAUDE.md`](./CLAUDE.md)** — reglas de
producto, modelo de datos, contratos de la API, sistema de diseño,
navegación, convenciones, TODOs.

## ⚡ Inicio rápido

```bash
cd expo
npm install
npm start          # Metro bundler
npm run ios        # build + simulador iOS
npm run android    # build + emulador Android
```

La app arranca en `LoginWithRoleScreen`. Elegí Player o Club desde el
segmented control y vas a `MainPlayer` / `MainClub`.

## 🎯 Toggle Claro / Oscuro / Sistema

Persistido en `AsyncStorage` bajo `@torna/theme-mode`. Programáticamente:

```tsx
import { useTheme } from './theme';

const { mode, setMode } = useTheme();
setMode('light');   // forzar claro
setMode('dark');    // forzar oscuro
setMode('system');  // seguir al SO
```

## 📁 Pantallas

`Login`, `LoginWithRole`, `Register`, `Pending`, `MainPlayer` (4 tabs +
🔍 Buscar), `MainClub` (5 tabs), `GameDetail`, `ClubProfile`,
`PlayerProfile`, `SearchPlay`, `JoinMatch`, `ReserveStep1/2/3`,
`ReserveSuccess`. Ver `CLAUDE.md` para la tabla completa.

## 🔌 Integración con la API real

La app **ya no usa mocks de datos**: consume la API real vía clientes
(`api/*`) y hooks (`hooks/use*`). `data/types.ts` (antes `mocks.ts`) solo
exporta tipos. Donde todavía no hay endpoint, la pantalla muestra **estado
vacío** — nunca datos falsos. Patrón para sumar/usar un endpoint:

1. Crear cliente `api/foo.ts` y/o hook `hooks/useFoo.ts` con tipo de retorno
   = el tipo de `data/types.ts`.
2. La pantalla (presentacional) recibe los datos por props.
3. El container/route en `App.tsx` llama al hook y le pasa los datos.

Los endpoints reales que la app consume están documentados en `CLAUDE.md`
→ "API real (lo que la app consume)".
