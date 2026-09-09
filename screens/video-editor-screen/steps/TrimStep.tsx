import React from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Play, Pause } from 'lucide-react-native';
import { Button } from '../../../components/ui';
import { Player, type PlayerHandle } from '../components/Player';
import { TrimRangeSlider, TRIM_MIN_SEC, TRIM_MAX_SEC, FILMSTRIP_H } from '../components/TrimRangeSlider';
import { VideoFilmstrip } from '../components/VideoFilmstrip';

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export interface TrimStepProps {
  recordingUrl: string;
  durationSeconds: number;
  range: [number, number];
  onChangeRange: (r: [number, number]) => void;
  onLoad?: (durationSeconds: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function TrimStep({
  recordingUrl, durationSeconds, range, onChangeRange, onLoad, onBack, onContinue,
}: TrimStepProps) {
  const playerRef = React.useRef<PlayerHandle | null>(null);
  const [sliderWidth, setSliderWidth] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(range[0]);
  // `autoPlay` en el <Player> de abajo arranca reproduciendo, así que el estado
  // inicial acá tiene que reflejar eso — si no, el primer tap en pantalla
  // "reanuda" un video que ya estaba corriendo y lo pausa al revés de lo que se ve.
  const [isPlaying, setIsPlaying] = React.useState(true);

  const onContainerLayout = (e: LayoutChangeEvent) =>
    setSliderWidth(e.nativeEvent.layout.width);

  React.useEffect(() => {
    playerRef.current?.seek(range[0]);
  }, [range[0]]);

  // Tocar el video en cualquier parte, o el botón del header, pausa/reanuda.
  // El `<Player>` ya limita la reproducción al fragmento [range[0], range[1]]
  // (ver `endAt` + el loop en Player.tsx) — pausar/reanudar nunca se sale de ahí.
  function togglePlayPause() {
    if (isPlaying) playerRef.current?.pause();
    else playerRef.current?.resume();
  }

  const sel = range[1] - range[0];
  const tooLong = sel > TRIM_MAX_SEC;
  const invalid = sel < TRIM_MIN_SEC || tooLong;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>

      {/* Video full screen */}
      <Player
        ref={playerRef}
        fullscreen
        recordingUrl={recordingUrl}
        durationSeconds={durationSeconds}
        startAt={range[0]}
        endAt={range[1]}
        autoPlay
        hideControls
        onProgress={setCurrentTime}
        onLoad={onLoad}
        onPlayingChange={setIsPlaying}
      />

      {/* Tocar el video pausa/reanuda. `hideControls` le saca al <Player> su propio
          botón de play — acá va uno propio porque este paso usa su panel inferior
          para el filmstrip, no para transporte de reproducción. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlayPause}>
        {!isPlaying && (
          <View style={styles.centerPlayWrap} pointerEvents="none">
            <View style={styles.centerPlayBtn}>
              <Play size={30} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>
        )}
      </Pressable>

      {/* Header overlay */}
      <SafeAreaView edges={['top']} style={styles.headerOverlay}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.stepPill}>
            <Text style={styles.stepLabel}>RECORTE · {fmt(range[0])}-{fmt(range[1])}</Text>
          </View>
          <Pressable onPress={togglePlayPause} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isPlaying
              ? <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
              : <Play size={18} color="#FFFFFF" fill="#FFFFFF" />}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Panel inferior */}
      <SafeAreaView edges={['bottom']} style={styles.bottomPanel}>
        <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 10 }}>

          {/* Filmstrip con handles superpuestos */}
          <View
            onLayout={onContainerLayout}
            style={{ borderRadius: 8, overflow: 'hidden', position: 'relative' }}
          >
            <VideoFilmstrip
              videoUrl={recordingUrl}
              durationSeconds={durationSeconds}
              frameCount={10}
              height={FILMSTRIP_H}
              containerWidth={sliderWidth}
            />
            <View style={StyleSheet.absoluteFill}>
              <TrimRangeSlider
                duration={durationSeconds}
                value={range}
                onChange={onChangeRange}
                currentTime={currentTime}
              />
            </View>
          </View>

          <Button
            fullWidth
            size="lg"
            variant={invalid ? 'disabled' : 'primary'}
            onPress={invalid ? undefined : onContinue}
          >
            Continuar →
          </Button>

          <Text style={[styles.hint, tooLong && styles.hintWarn]}>
            {tooLong
              ? `Máximo ${fmt(TRIM_MAX_SEC)} por highlight — acortá la selección`
              : `Los highlights pueden durar entre ${TRIM_MIN_SEC}s y ${fmt(TRIM_MAX_SEC)}`}
          </Text>
        </View>
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    // el triángulo del ícono no está centrado ópticamente en su propio box —
    // un pelín de padding a la izquierda lo compensa.
    paddingLeft: 4,
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  stepLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  hint: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  hintWarn: {
    color: '#BFFE3D',
    fontWeight: '800',
  },
});
