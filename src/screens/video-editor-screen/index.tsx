import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useB2Files} from './hooks/useB2Files';
import {useVideoInfo} from './hooks/useVideoInfo';
import {useTrimJob} from './hooks/useTrimJob';
import {B2FileList} from './components/B2FileList';
import {VideoEditorPreview} from './components/VideoEditorPreview';

import {useTimelineSelection} from '@/screens/highlight-editor-screen/hooks/useTimelineSelection';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import {UploadProgressBar} from '@/components/upload-progress-bar';
import Player from '@/components/video-player/player';
import CustomHeader from '@/components/header/CustomHeader';
import {Spinner} from '@/components/Spinner';
import {B2FileItem} from '@/api/video/FilesApi';
import {colors} from '@/config/theme';

type Props = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.videoEditor'
>;
type Step = 'select' | 'editor' | 'processing' | 'result';

export const VideoEditorScreen: React.FC<Props> = ({route}) => {
  const preselectedKey = route.params?.b2FileName ?? null;

  const [step, setStep] = useState<Step>(preselectedKey ? 'editor' : 'select');
  const [selectedFile, setSelectedFile] = useState<B2FileItem | null>(
    preselectedKey
      ? {key: preselectedKey, name: preselectedKey, size: 0, lastModified: ''}
      : null,
  );
  const [seekTarget, setSeekTarget] = useState<number | undefined>(undefined);

  const {
    files,
    isLoading: loadingFiles,
    error: filesError,
    refetch,
  } = useB2Files();
  const {
    streamUrl,
    durationSeconds,
    isLoading: loadingInfo,
    error: infoError,
  } = useVideoInfo(
    step === 'editor' || step === 'processing'
      ? selectedFile?.key ?? null
      : null,
  );

  const timeline = useTimelineSelection({
    maxDuration: durationSeconds ?? 90,
    minClipDuration: 3,
    maxClipDuration: 90,
  });

  const {state: trimState, startTrim, reset: resetTrim} = useTrimJob();

  useEffect(() => {
    if (trimState.phase === 'polling' || trimState.phase === 'starting') {
      setStep('processing');
    } else if (trimState.phase === 'completed') {
      setStep('result');
    }
  }, [trimState.phase]);

  const handleSelectFile = (file: B2FileItem) => {
    setSelectedFile(file);
    setStep('editor');
  };

  const handleCutClip = async () => {
    if (!selectedFile || !timeline.isValid) {
      return;
    }
    await startTrim(selectedFile.key, timeline.start, timeline.end);
  };

  const handleCutAnother = () => {
    resetTrim();
    setSelectedFile(null);
    setStep('select');
  };

  const handleStartChange = (value: number) => {
    timeline.onStartChange(value);
    setSeekTarget(value);
  };

  // STEP 1 — File Selection
  if (step === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader textCenter="Editor de Video" />
        <B2FileList
          files={files}
          isLoading={loadingFiles}
          error={filesError}
          selectedKey={selectedFile?.key ?? null}
          onSelect={handleSelectFile}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  // STEP 2 — Editor
  if (step === 'editor') {
    if (loadingInfo) {
      return (
        <SafeAreaView style={styles.container}>
          <CustomHeader textCenter="Editor de Video" />
          <View style={styles.center}>
            <Spinner />
            <Text style={styles.loadingText}>Cargando video...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (infoError || !streamUrl || !durationSeconds) {
      return (
        <SafeAreaView style={styles.container}>
          <CustomHeader textCenter="Editor de Video" />
          <View style={styles.center}>
            <Text style={styles.errorText}>
              {infoError ?? 'No se pudo cargar el video'}
            </Text>
            <TouchableOpacity onPress={() => setStep('select')}>
              <Text style={styles.linkText}>Volver a selección</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader textCenter={selectedFile?.name ?? 'Editor de Video'} />
        <ScrollView contentContainerStyle={styles.content}>
          <VideoEditorPreview
            streamUrl={streamUrl}
            durationSeconds={durationSeconds}
            startTime={timeline.start}
            endTime={timeline.end}
            onStartChange={handleStartChange}
            onEndChange={timeline.onEndChange}
            seekTarget={seekTarget}
          />
          {!timeline.isValid && (
            <Text style={styles.validationText}>
              El clip debe tener entre 3 y 90 segundos
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !timeline.isValid && styles.buttonDisabled,
            ]}
            onPress={handleCutClip}
            disabled={!timeline.isValid}
            activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>Cortar Clip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep('select')}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Cambiar video</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // STEP 3 — Processing
  if (step === 'processing') {
    const progress = trimState.phase === 'polling' ? trimState.job.progress : 0;
    const hasFailed = trimState.phase === 'failed';

    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader textCenter="Procesando" />
        <View style={styles.center}>
          {hasFailed ? (
            <>
              <Text style={styles.errorText}>
                {trimState.phase === 'failed' ? trimState.error : ''}
              </Text>
              <TouchableOpacity onPress={() => setStep('editor')}>
                <Text style={styles.linkText}>Volver al editor</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <UploadProgressBar progress={progress} />
              <Text style={styles.statusText}>Procesando en servidor...</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // STEP 4 — Result
  const resultUrl = trimState.phase === 'completed' ? trimState.publicUrl : '';

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader textCenter="Clip Listo" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.playerContainer}>
          <Player uri={resultUrl} containerStyle={styles.player} />
        </View>
        <Text style={styles.successText}>Clip generado exitosamente</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCutAnother}
          activeOpacity={0.7}>
          <Text style={styles.primaryButtonText}>Cortar otro clip</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VideoEditorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.dark,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  validationText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  player: {
    flex: 1,
  },
});
