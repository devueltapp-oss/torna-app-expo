import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Button, Input, VisibilityCard } from '../../../components/ui';
import { Player } from '../components/Player';

const TITLE_MAX = 50;

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export type Visibility = 'private' | 'public';

export interface MetadataStepProps {
  recordingUrl: string;
  durationSeconds: number;
  range: [number, number];
  title: string;
  onChangeTitle: (s: string) => void;
  visibility: Visibility;
  onChangeVisibility: (v: Visibility) => void;
  onBack: () => void;
  onGenerate: () => void;
}

/**
 * Paso 3 del editor — el usuario elige título + visibilidad antes de
 * generar. La visibilidad reemplaza al viejo toggle "Guardar como
 * highlight": el highlight SIEMPRE se guarda (es lo que estamos por
 * generar); lo que el usuario decide acá es a quién mostrárselo.
 *
 *   private → queda en la sección "Mis highlights" de la biblioteca
 *   public  → publica al feed + aparece en el perfil público
 */
export function MetadataStep({
  recordingUrl, durationSeconds, range, title, onChangeTitle, visibility, onChangeVisibility, onBack, onGenerate,
}: MetadataStepProps) {
  const { colors } = useTheme();
  const titleErr = title.length > TITLE_MAX ? `Máximo ${TITLE_MAX} caracteres.` : null;

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.2 }}>PASO 3 DE 4</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 4 }}>
          Detalles del clip
        </Text>
      </View>

      {/* clip preview — reproduce en loop SOLO el rango elegido (lo que se va a subir) */}
      <View style={{ gap: 8 }}>
        <Player
          recordingUrl={recordingUrl}
          durationSeconds={durationSeconds}
          startAt={range[0]}
          endAt={range[1]}
          autoPlay
          muted
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700', letterSpacing: 0.6 }}>CLIP</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, fontFamily: 'Menlo' }}>
            {fmt(range[0])} → {fmt(range[1])} · {fmt(range[1] - range[0])}
          </Text>
        </View>
      </View>

      <Input
        label="Título (opcional)"
        placeholder="Ej: Remate final · Maxi vs Diego"
        value={title}
        onChangeText={onChangeTitle}
        error={titleErr}
        hint={titleErr ? undefined : `${title.length}/${TITLE_MAX}`}
      />

      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text2 }}>¿Quién puede ver este highlight?</Text>
      <VisibilityCard
        colors={colors}
        selected={visibility === 'private'} onPress={() => onChangeVisibility('private')}
        icon="🔒" title="Solo para mí"
        subtitle="Queda en tu biblioteca privada. Nadie más lo ve hasta que lo publiques."
      />
      <VisibilityCard
        colors={colors}
        selected={visibility === 'public'} onPress={() => onChangeVisibility('public')}
        icon="🌐" title="Público en el feed"
        subtitle="Aparece en el feed de quienes te siguen y en tu perfil público."
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="soft" size="lg" onPress={onBack}>Volver</Button>
        <View style={{ flex: 1 }}>
          <Button
            fullWidth size="lg"
            variant={titleErr ? 'disabled' : 'primary'}
            onPress={titleErr ? undefined : onGenerate}>
            Generar clip
          </Button>
        </View>
      </View>
    </View>
  );
}
