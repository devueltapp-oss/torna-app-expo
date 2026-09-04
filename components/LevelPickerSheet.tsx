/**
 * LevelPickerSheet — elegir el nivel de juego, con la UI de Torna.
 *
 * ⚠️ **Reemplaza a `@react-native-picker/picker`** (2026-09-03). Esa rueda es un
 * widget **nativo**, y ahí estaban los tres problemas que se reportaron:
 *
 * 1. **Pantalla en blanco.** En Android el `Picker` no es una rueda: abre un
 *    diálogo del sistema, pintado por el OS y no por el tema de la app. Con el
 *    tema oscuro puesto en Torna y el claro en el teléfono, salía un panel
 *    blanco encima de la pantalla.
 * 2. **La UI no acompañaba al resto.** Tipografía, radios y colores del sistema,
 *    no los de la marca — el único control de la app que no se veía como la app.
 * 3. **Texto cortado.** El ítem nativo es de **una sola línea**: etiquetas como
 *    "Nivel 4 · Intermedio alto — Juegas con constancia" se truncaban justo en
 *    la parte que explica el número, que es lo único que lo hace elegible.
 *
 * Es el mismo patrón que [[ConfirmSheet]]/`FollowListSheet`: `Modal`
 * transparente, velo azul de marca y hoja de abajo. El nombre y la descripción
 * van en **dos líneas propias**, así no hay nada que truncar.
 */
import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, Animated } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

export interface PlayLevel { value: number; label: string; hint: string }

/**
 * ⚠️ **1 es el nivel MÁS ALTO** — convención de pádel, la misma que usa
 * `Game.category`/`User.category` en el backend. Si se reordena esto, se rompe
 * el significado del dato ya guardado: cambiá las etiquetas, no los números.
 */
export const PLAY_LEVELS: PlayLevel[] = [
  { value: 1, label: 'Nivel 1 · Profesional',      hint: 'Compites en circuito' },
  { value: 2, label: 'Nivel 2 · Avanzado alto',    hint: 'Competencia habitual' },
  { value: 3, label: 'Nivel 3 · Avanzado',         hint: 'Dominas todos los golpes' },
  { value: 4, label: 'Nivel 4 · Intermedio alto',  hint: 'Juegas con constancia' },
  { value: 5, label: 'Nivel 5 · Intermedio',       hint: 'Ya tienes partidos jugados' },
  { value: 6, label: 'Nivel 6 · Principiante',     hint: 'Empezando a jugar' },
  { value: 7, label: 'Nivel 7 · Iniciación',       hint: 'Primera vez en una cancha' },
];

/** Etiqueta del nivel actual, para el campo cerrado. `null` = sin declarar. */
export function levelLabel(value: number | null): string {
  return PLAY_LEVELS.find((l) => l.value === value)?.label ?? 'Sin declarar';
}

export interface LevelPickerSheetProps {
  visible: boolean;
  /** Nivel actual. `null` = sin declarar, que es un estado válido. */
  value: number | null;
  onSelect: (value: number | null) => void;
  onClose: () => void;
}

export function LevelPickerSheet({ visible, value, onSelect, onClose }: LevelPickerSheetProps) {
  const { colors } = useTheme();
  // Solo en el handle (no en toda la hoja): abajo hay un ScrollView con las
  // opciones, y un PanResponder sobre toda la hoja le pelearía el gesto de
  // scroll — ver el comentario de `useSwipeToDismiss`.
  const { translateY, panHandlers } = useSwipeToDismiss(onClose);

  /** Elegir cierra: no hay "aceptar" que confirmar sobre una sola decisión. */
  const pick = (v: number | null) => { onSelect(v); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }}
        onPress={onClose}
        testID="level-sheet-backdrop"
      >
        <Animated.View
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '80%',
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingTop: 14, paddingBottom: 28,
            transform: [{ translateY }],
          }}
        >
          <Pressable onPress={() => {}}>
          {/* El gesto de cerrar va SOLO en esta zona (handle + título), no en
              toda la hoja: el `ScrollView` de las opciones es HERMANO de este
              `View`, no descendiente — así un arrastre que empieza en la
              lista nunca le pregunta a este PanResponder si lo quiere, y el
              scroll no se pelea con el swipe-to-dismiss. */}
          <View {...panHandlers}>
            <View style={{
              alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
              backgroundColor: colors.line, marginBottom: 16,
            }} />

            <Text style={{
              fontFamily: fonts.bold, fontSize: 18, color: colors.text,
              letterSpacing: -0.3, paddingHorizontal: 20, marginBottom: 4,
            }}>
              Nivel de juego
            </Text>
            <Text style={{
              fontSize: 13, color: colors.muted2, lineHeight: 18,
              paddingHorizontal: 20, marginBottom: 12,
            }}>
              El 1 es el nivel más alto.
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            <LevelRow
              label="Sin declarar"
              hint="No mostrar mi nivel"
              on={value == null}
              onPress={() => pick(null)}
            />
            {PLAY_LEVELS.map((l) => (
              <LevelRow
                key={l.value}
                label={l.label}
                hint={l.hint}
                on={value === l.value}
                onPress={() => pick(l.value)}
                testID={`level-option-${l.value}`}
              />
            ))}
          </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function LevelRow({
  label, hint, on, onPress, testID,
}: {
  label: string;
  hint: string;
  on: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 12,
        backgroundColor: on ? colors.bg2 : 'transparent',
      }}
    >
      {/* Nombre y descripción en líneas propias: acá está el arreglo del texto
          cortado — el ítem nativo daba una sola línea y truncaba la explicación. */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text }}>
          {label}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted2, lineHeight: 17 }}>
          {hint}
        </Text>
      </View>
      {on && <Check size={20} color={colors.accentText} />}
    </Pressable>
  );
}
