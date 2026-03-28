import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useVideoMetadata} from './hooks/useVideoMetadata';
import {useTimelineSelection} from './hooks/useTimelineSelection';
import {useClipGeneration} from './hooks/useClipGeneration';
import {useGameClips} from './hooks/useGameClips';
import {VideoPreview} from './components/VideoPreview';
import {DurationCounter} from './components/DurationCounter';
import {GenerateClipButton} from './components/GenerateClipButton';
import {ClipsList} from './components/ClipsList';
import {ClipPlayerModal} from './components/ClipPlayerModal';

import {useAuth} from '@/contexts/authContext';
import {
  startTrimJobApi,
  getJobStatusApi,
  JobStatus,
} from '@/api/video/PipelineApi';
import {useCreateHighlight} from './hooks/useCreateHighlight';
import {deleteClipApi} from '@/api/video/DeleteClipApi';
import {ClipResponse} from '@/api/video/PostCreateClipApi';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import CustomHeader from '@/components/header/CustomHeader';
import {TrimRangeSlider} from '@/components/trim-range-slider';
import {UploadProgressBar} from '@/components/upload-progress-bar';
import {colors} from '@/config/theme';
import {Spinner} from '@/components/Spinner';
import Popup from '@/components/popup/Popup';

type Props = NativeStackScreenProps<
  MainNavigatorParamList,
  'screens.highlightEditor'
>;

function extractStorageKey(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.replace(/^\//, '');
  } catch {
    return url;
  }
}

export const HighlightEditorScreen: React.FC<Props> = ({route, navigation}) => {
  const gameId = route.params?.gameId;
  const [currentTime, setCurrentTime] = useState(0);
  const [paused, setPaused] = useState(false);

  // Cargar datos del partido
  const {
    recordingUrl,
    durationSeconds,
    game,
    isLoading: isLoadingGame,
    error: gameError,
  } = useVideoMetadata(gameId);

  // Manejo de selección de tiempo
  const timelineSelection = useTimelineSelection({
    maxDuration: durationSeconds && durationSeconds > 0 ? durationSeconds : 60,
    minClipDuration: 3,
    maxClipDuration: 60,
  });

  // Generación de clips
  const {
    generateClip,
    isGenerating,
    progress,
    error: clipError,
    clipResponse,
  } = useClipGeneration();

  // Obtener clips existentes del juego
  const {
    clips,
    isLoading: isLoadingClips,
    refetch: refetchClips,
  } = useGameClips(gameId);
  const {getAccessToken} = useAuth();

  // Estado para el modal de reproducción
  const [selectedClip, setSelectedClip] = useState<ClipResponse | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Estado para el popup de éxito
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    'Clip generado exitosamente',
  );
  const [successPopupPosition, setSuccessPopupPosition] = useState('5%');

  // Highlight creation
  const {createHighlight, isCreating: isCreatingHighlight} =
    useCreateHighlight();

  // Estado para el trabajo de pipeline
  const [trimJob, setTrimJob] = useState<JobStatus | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling del estado del job
  useEffect(() => {
    if (
      trimJob &&
      (trimJob.status === 'PENDING' || trimJob.status === 'RUNNING')
    ) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const token = await getAccessToken();
          const status = await getJobStatusApi(token, trimJob.job_id);
          setTrimJob(status);
        } catch {
          // Silently ignore polling errors to avoid spamming alerts
        }
      }, 2500);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [trimJob, getAccessToken]);

  const handleGenerateClip = async () => {
    if (!recordingUrl || !gameId) {
      Alert.alert('Error', 'No hay video disponible para generar el clip');
      return;
    }

    try {
      const response = await generateClip(
        recordingUrl,
        timelineSelection.start,
        timelineSelection.end,
        gameId,
      );

      if (response) {
        await refetchClips();

        setSuccessMessage('Clip generado exitosamente');
        setSuccessPopupPosition('5%');
        setShowSuccessPopup(true);
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 2500);
      } else if (clipError) {
        Alert.alert('Error', clipError);
      }
    } catch (error: any) {
      console.error('Error en handleGenerateClip:', error);
      Alert.alert(
        'Error',
        error?.message || 'Ocurrió un error al generar el clip',
      );
    }
  };

  const handleSaveHighlight = async () => {
    if (!recordingUrl || !gameId) {
      Alert.alert('Error', 'No hay video disponible para crear el highlight');
      return;
    }

    try {
      const result = await createHighlight(
        gameId,
        recordingUrl,
        timelineSelection.start,
        timelineSelection.end,
      );

      if (result) {
        setSuccessMessage('Highlight guardado exitosamente');
        setSuccessPopupPosition('5%');
        setShowSuccessPopup(true);
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 2500);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Ocurrió un error al guardar el highlight',
      );
    }
  };

  const handleServerTrim = async () => {
    if (!recordingUrl) {
      Alert.alert('Error', 'No hay video disponible para recortar');
      return;
    }

    setIsTrimming(true);
    try {
      const token = await getAccessToken();
      const sourceKey = extractStorageKey(recordingUrl);
      const jobResponse = await startTrimJobApi(token, {
        sourceKey,
        startTime: timelineSelection.start,
        endTime: timelineSelection.end,
      });
      setTrimJob({
        job_id: jobResponse.job_id,
        status: jobResponse.status,
        progress: 0,
        publicUrl: jobResponse.publicUrl,
      });
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Ocurrió un error al iniciar el recorte en servidor',
      );
    } finally {
      setIsTrimming(false);
    }
  };

  const handleSaveHighlightFromTrim = async () => {
    if (!trimJob?.publicUrl || !gameId) {
      return;
    }
    try {
      const result = await createHighlight(
        gameId,
        trimJob.publicUrl,
        timelineSelection.start,
        timelineSelection.end,
      );
      if (result) {
        setSuccessMessage('Highlight guardado exitosamente');
        setSuccessPopupPosition('5%');
        setShowSuccessPopup(true);
        setTimeout(() => setShowSuccessPopup(false), 2500);
        setTrimJob(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo guardar el highlight');
    }
  };

  if (isLoadingGame) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Editor de Highlights" />
        <View style={styles.loadingContainer}>
          <Spinner size="large" />
          <Text style={styles.loadingText}>Cargando datos del partido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (gameError || !recordingUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Editor de Highlights" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {gameError || 'No hay video disponible para este partido'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!durationSeconds || durationSeconds === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Editor de Highlights" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No se pudo obtener la duración del video. Por favor, intenta más
            tarde.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Editor de Highlights" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        {/* Video Preview */}
        <VideoPreview
          recordingUrl={recordingUrl}
          currentTime={currentTime}
          onProgress={data => setCurrentTime(data.currentTime)}
          paused={paused}
          seekToTime={undefined}
        />

        {/* Contador de duración */}
        <View style={styles.durationContainer}>
          <DurationCounter duration={timelineSelection.duration} />
          {!timelineSelection.isValid && (
            <Text style={styles.validationText}>
              La duración debe estar entre 3 y 60 segundos
            </Text>
          )}
        </View>

        {/* Timeline de recorte */}
        <TrimRangeSlider
          duration={durationSeconds}
          startTime={timelineSelection.start}
          endTime={timelineSelection.end}
          onStartChange={timelineSelection.onStartChange}
          onEndChange={timelineSelection.onEndChange}
          maxDuration={60}
        />

        {/* Botones de acción */}
        <View style={styles.buttonContainer}>
          <GenerateClipButton
            onPress={handleGenerateClip}
            disabled={!timelineSelection.isValid}
            isLoading={isGenerating}
          />
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (!timelineSelection.isValid || isCreatingHighlight) &&
                styles.secondaryButtonDisabled,
            ]}
            onPress={handleSaveHighlight}
            disabled={!timelineSelection.isValid || isCreatingHighlight}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              {isCreatingHighlight ? 'Guardando...' : 'Guardar como Highlight'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              (!timelineSelection.isValid || isTrimming) &&
                styles.secondaryButtonDisabled,
            ]}
            onPress={handleServerTrim}
            disabled={!timelineSelection.isValid || isTrimming}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              {isTrimming ? 'Enviando...' : 'Recortar en servidor'}
            </Text>
          </TouchableOpacity>
          {clipError && <Text style={styles.errorText}>{clipError}</Text>}
        </View>

        {/* Lista de clips generados */}
        <ClipsList
          clips={clips}
          onClipPress={clip => {
            setSelectedClip(clip);
            setIsModalVisible(true);
          }}
          onClipDelete={async clip => {
            try {
              const token = await getAccessToken();
              await deleteClipApi(token, clip.clipId);
              await refetchClips();
              setSuccessMessage('Clip eliminado exitosamente');
              setSuccessPopupPosition('10%');
              setShowSuccessPopup(true);
              setTimeout(() => {
                setShowSuccessPopup(false);
              }, 2500);
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message ||
                  'No se pudo eliminar el clip. Por favor, intenta nuevamente.',
              );
            }
          }}
        />

        {/* Estado del trabajo de pipeline */}
        {trimJob !== null && (
          <View style={styles.jobStatusContainer}>
            {(trimJob.status === 'PENDING' || trimJob.status === 'RUNNING') && (
              <>
                <UploadProgressBar progress={trimJob.progress} />
                <Text style={styles.jobStatusText}>
                  Procesando en servidor...
                </Text>
              </>
            )}
            {trimJob.status === 'COMPLETED' && (
              <View>
                <Text style={styles.jobStatusCompleted}>
                  Clip procesado en servidor
                </Text>
                {trimJob.publicUrl ? (
                  <>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setSelectedClip({
                          clipUrl: trimJob.publicUrl!,
                          clipId: '',
                          thumbnailUrl: '',
                        } as any);
                        setIsModalVisible(true);
                      }}>
                      <Text style={styles.secondaryButtonText}>
                        Reproducir clip
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={handleSaveHighlightFromTrim}
                      disabled={isCreatingHighlight}>
                      <Text style={styles.secondaryButtonText}>
                        {isCreatingHighlight
                          ? 'Guardando...'
                          : 'Guardar como Highlight'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.jobStatusText}>
                    Key: {trimJob.output_key}
                  </Text>
                )}
              </View>
            )}
            {trimJob.status === 'FAILED' && (
              <Text style={styles.jobStatusFailed}>
                {trimJob.error || 'Error al procesar el clip en el servidor'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de reproducción de clip */}
      <ClipPlayerModal
        visible={isModalVisible}
        clip={selectedClip}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedClip(null);
        }}
      />

      {/* Popup de éxito */}
      {showSuccessPopup && (
        <Popup
          description={successMessage}
          positionTop={successPopupPosition}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || colors.white || '#fff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background || colors.white || '#fff',
  },
  content: {
    padding: 16,
    backgroundColor: colors.background || colors.white || '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background || colors.white || '#fff',
  },
  loadingText: {
    color: colors.dark || colors.neutral900 || '#000',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background || colors.white || '#fff',
  },
  errorText: {
    color: colors.danger || '#F44336',
    fontSize: 16,
    textAlign: 'center',
  },
  durationContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  validationText: {
    color: colors.danger || '#F44336',
    fontSize: 12,
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.primary || '#2d4c75',
  },
  secondaryButtonDisabled: {
    borderColor: colors.neutral400 || '#94A3B8',
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: colors.primary || '#2d4c75',
    fontSize: 16,
    fontWeight: '600',
  },
  jobStatusContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    gap: 8,
  },
  jobStatusText: {
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
  },
  jobStatusCompleted: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  jobStatusFailed: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
