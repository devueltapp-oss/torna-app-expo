/**
 * UploadSheet — modal bottom-sheet para subir contenido desde el FAB
 * de "Mi biblioteca". Tres tipos:
 *
 *   - photo     → sin duración (foto)
 *   - video     → máx 3:00, va a "Mis subidas"
 *   - highlight → máx 1:00, va a "Mis highlights"
 *
 * Usa expo-image-picker para seleccionar el asset real y lo sube a B2
 * mediante un presigned URL obtenido desde el backend.
 */
import React from 'react';
import {
  Modal, View, Text, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Camera, Video as VideoIcon, Play } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../theme';
import { Button, Input } from './ui';
import { ContentThumb, type ThumbKind } from './ContentThumb';

export type UploadKind = 'photo' | 'video' | 'highlight';
export type UploadVisibility = 'private' | 'public';

export interface UploadResult {
  kind: UploadKind;
  title: string;
  visibility: UploadVisibility;
}

export interface UploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: UploadResult) => void;
}

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function UploadSheet({ visible, onClose, onConfirm }: UploadSheetProps) {
  const { colors } = useTheme();
  const [step, setStep] = React.useState<'pick' | 'configure'>('pick');
  const [kind, setKind] = React.useState<UploadKind | null>(null);
  const [title, setTitle] = React.useState('');
  const [visibility, setVisibility] = React.useState<UploadVisibility>('private');
  const [mockDuration, setMockDuration] = React.useState(45);
  const [pickedAsset, setPickedAsset] = React.useState<{
    uri: string; type?: string; duration?: number;
  } | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Reset state cada vez que se abre
  React.useEffect(() => {
    if (visible) {
      setStep('pick');
      setKind(null);
      setTitle('');
      setVisibility('private');
      setMockDuration(30 + Math.floor(Math.random() * 170));
      setPickedAsset(null);
      setUploading(false);
    }
  }, [visible]);

  // Use real asset duration when available, otherwise fall back to mockDuration
  const displayDuration = pickedAsset?.duration != null ? pickedAsset.duration / 1000 : mockDuration;
  const MAX_SEC = kind === 'highlight' ? 60 : kind === 'video' ? 180 : 0;
  const tooLong = (kind === 'video' || kind === 'highlight') && displayDuration > MAX_SEC;

  async function pickAsset(k: UploadKind) {
    const isVideo = k === 'video' || k === 'highlight';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: isVideo ? 'videos' : 'images',
      quality: 0.85,
      videoMaxDuration: isVideo ? 180 : undefined,
      allowsEditing: !isVideo,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPickedAsset({
        uri: asset.uri,
        type: isVideo ? 'video' : 'photo',
        duration: asset.duration ?? undefined,
      });
    }
  }

  const pickKind = (k: UploadKind) => {
    setKind(k);
    setStep('configure');
    pickAsset(k);
  };

  async function handleUpload() {
    if (!kind || tooLong) return;
    // If no real asset was picked (picker cancelled), fall through with onConfirm only
    if (!pickedAsset) {
      onConfirm({ kind, title, visibility });
      return;
    }

    setUploading(true);
    try {
      const isVideo = pickedAsset.type === 'video';
      const ext = pickedAsset.uri.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg');
      const mime = isVideo ? 'video/mp4' : 'image/jpeg';
      const key = `media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
      const token = await SecureStore.getItemAsync('@torna/auth-token');

      // 1. Presigned URL de B2
      const urlRes = await fetch(
        `${apiUrl}/files/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(mime)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!urlRes.ok) throw new Error('No se pudo obtener URL de upload');
      const { uploadUrl } = await urlRes.json();

      // 2. Subir a B2
      const fileBlob = await fetch(pickedAsset.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mime },
        body: fileBlob,
      });
      if (!uploadRes.ok) throw new Error('Upload a B2 falló');

      // 3. URL final
      let finalUrl: string;
      if (isVideo) {
        const streamRes = await fetch(
          `${apiUrl}/files/stream?key=${encodeURIComponent(key)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const { url } = await streamRes.json();
        finalUrl = url;
      } else {
        finalUrl = `https://f005.backblazeb2.com/file/torna-videos/${key}`;
      }

      // 4. Registrar en backend
      await fetch(`${apiUrl}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          url: finalUrl,
          kind: isVideo ? 'video' : 'photo',
          title: title ?? '',
          visibility,
        }),
      });

      onConfirm({ kind, title, visibility });
    } catch (err) {
      console.error('Upload error:', err);
      // TODO: mostrar error al usuario
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,76,117,0.45)' }}>
        <View style={{
          backgroundColor: colors.bg,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22,
          gap: 12,
        }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong }}/>

          {step === 'pick' ? (
            <PickStep colors={colors} onPick={pickKind} onClose={onClose}/>
          ) : kind ? (
            <ConfigureStep
              colors={colors} kind={kind} displayDuration={displayDuration} maxSec={MAX_SEC} tooLong={tooLong}
              title={title} onChangeTitle={setTitle}
              visibility={visibility} onChangeVisibility={setVisibility}
              uploading={uploading}
              onChange={() => { setStep('pick'); setPickedAsset(null); }}
              onCancel={onClose}
              onConfirm={handleUpload}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─────────────────────  PICK STEP  ───────────────────── */

interface PickStepProps {
  colors: ReturnType<typeof useTheme>['colors'];
  onPick: (k: UploadKind) => void;
  onClose: () => void;
}

function PickStep({ colors, onPick, onClose }: PickStepProps) {
  return (
    <>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Subir contenido</Text>
      <Text style={{ fontSize: 12, color: colors.muted2 }}>
        Elegí qué querés subir. Después decidís si lo hacés público.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <PickCard label="Foto" sub="Próximamente" icon={<Camera size={20} color={colors.muted2}/>}
          colors={colors} disabled onPress={() => {}}/>
        <PickCard label="Video" sub="Próximamente" icon={<VideoIcon size={20} color={colors.muted2}/>}
          colors={colors} disabled onPress={() => {}}/>
        <PickCard label="Highlight" sub="máx 1:00" icon={<Play size={20} color={colors.ink}/>}
          highlighted colors={colors} onPress={() => onPick('highlight')}/>
      </View>

      <Button variant="ghost" fullWidth onPress={onClose}>Cancelar</Button>
    </>
  );
}

function PickCard({ label, sub, icon, onPress, colors, highlighted, disabled }: {
  label: string; sub: string; icon: React.ReactNode; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; highlighted?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => ({
      flex: 1, alignItems: 'center', gap: 8,
      paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12,
      backgroundColor: highlighted ? colors.accentSoft : colors.surface,
      borderWidth: 1.5, borderColor: highlighted ? colors.accent : colors.line,
      opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
    })}>
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: highlighted ? colors.accent : colors.bg2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '800', color: disabled ? colors.muted2 : colors.text }}>{label}</Text>
      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.muted2, letterSpacing: 0.4 }}>{sub}</Text>
    </Pressable>
  );
}

/* ─────────────────────  CONFIGURE STEP  ───────────────────── */

interface ConfigureStepProps {
  colors: ReturnType<typeof useTheme>['colors'];
  kind: UploadKind;
  displayDuration: number;
  maxSec: number;
  tooLong: boolean;
  title: string;
  onChangeTitle: (s: string) => void;
  visibility: UploadVisibility;
  onChangeVisibility: (v: UploadVisibility) => void;
  uploading: boolean;
  onChange: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfigureStep(p: ConfigureStepProps) {
  const { colors, kind, displayDuration, maxSec, tooLong, title, onChangeTitle, visibility,
          onChangeVisibility, uploading, onChange, onCancel, onConfirm } = p;
  const headerTitle = kind === 'highlight' ? 'Subir highlight'
                    : kind === 'photo'     ? 'Tu foto'
                                           : 'Tu video';
  const thumbKind: ThumbKind = kind === 'photo' ? 'upload-photo'
                             : kind === 'highlight' ? 'highlight'
                                                    : 'upload-video';

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{headerTitle}</Text>
        <Pressable onPress={onChange} hitSlop={6}>
          <Text style={{ color: colors.muted2, fontSize: 12, fontWeight: '700' }}>Cambiar</Text>
        </Pressable>
      </View>

      <ContentThumb kind={thumbKind} aspect="wide"
        durationLabel={kind === 'photo' ? undefined : fmt(displayDuration)}/>

      {tooLong ? (
        <View style={{
          backgroundColor: colors.accentSoft, borderRadius: 10,
          paddingHorizontal: 12, paddingVertical: 8,
        }}>
          <Text style={{ fontSize: 11, color: colors.accentText, fontWeight: '700', lineHeight: 16 }}>
            Este video dura {fmt(displayDuration)} y supera los {fmt(maxSec)}.
            {kind === 'highlight' ? ' Recortalo a 1:00 máximo antes de subirlo.' : ' Recortalo antes de subirlo.'}
          </Text>
        </View>
      ) : null}

      <Input
        label="Título (opcional)"
        placeholder={kind === 'highlight' ? 'Ej: Remate final · Maxi vs Diego' : 'Ej: Calentamiento previo al partido'}
        value={title} onChangeText={onChangeTitle}
      />

      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text2 }}>¿Quién puede verlo?</Text>
      <VisibilityCard
        selected={visibility === 'private'} onPress={() => onChangeVisibility('private')}
        colors={colors} icon="🔒" title="Solo para mí"
        subtitle="Queda en tu biblioteca privada. Lo podés hacer público después."
      />
      <VisibilityCard
        selected={visibility === 'public'} onPress={() => onChangeVisibility('public')}
        colors={colors} icon="🌐" title="Público en mi perfil"
        subtitle={kind === 'highlight'
          ? 'Aparece en la tab Highlights de tu perfil y en el feed de tus seguidores.'
          : 'Aparece en la tab Fotos / Highlights de tu perfil.'}
      />

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Button variant="soft" size="lg" onPress={onCancel}>Cancelar</Button>
        <View style={{ flex: 1 }}>
          {uploading ? (
            <View style={{
              flex: 1, height: 48, borderRadius: 12,
              backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
            }}>
              <ActivityIndicator color={colors.ink} size="small" />
            </View>
          ) : (
            <Button fullWidth size="lg"
              variant={tooLong ? 'disabled' : 'primary'}
              onPress={tooLong ? undefined : onConfirm}>
              Subir
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/* ─────────────────────  VisibilityCard  ───────────────────── */

interface VisibilityCardProps {
  selected: boolean;
  onPress: () => void;
  icon: string;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

export function VisibilityCard(p: VisibilityCardProps) {
  const { colors } = p;
  return (
    <Pressable onPress={p.onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
      backgroundColor: p.selected ? colors.accentSoft : colors.surface,
      borderWidth: 1.5, borderColor: p.selected ? colors.accent : colors.line,
      opacity: pressed ? 0.9 : 1,
    })}>
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: p.selected ? colors.accent : colors.bg2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 16 }}>{p.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{p.title}</Text>
        <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1, lineHeight: 15 }}>{p.subtitle}</Text>
      </View>
      <View style={{
        width: 18, height: 18, borderRadius: 9,
        borderWidth: 2, borderColor: p.selected ? colors.ink : colors.lineStrong,
        backgroundColor: p.selected ? colors.ink : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {p.selected ? <View style={{ width: 6, height: 6, backgroundColor: colors.accent, borderRadius: 3 }}/> : null}
      </View>
    </Pressable>
  );
}
