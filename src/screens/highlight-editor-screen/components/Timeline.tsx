import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { SelectionHandles } from './SelectionHandles';

interface TimelineProps {
  duration: number; // Duración total del video en segundos
  start: number; // Timestamp de inicio seleccionado
  end: number; // Timestamp de fin seleccionado
  currentTime: number; // Tiempo actual del video
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  onSelectionMove: (deltaSeconds: number) => void; // Mover toda la selección
  onCurrentTimeChange: (value: number) => void; // Cambiar tiempo actual
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  start,
  end,
  currentTime,
  onStartChange,
  onEndChange,
  onSelectionMove,
  onCurrentTimeChange,
}) => {
  const { width } = Dimensions.get('window');
  const timelineWidth = width - 40; // Padding lateral
  
  // Evitar división por cero
  const safeDuration = duration > 0 ? duration : 1;

  const startPositionRef = useRef((start / safeDuration) * timelineWidth);
  const endPositionRef = useRef((end / safeDuration) * timelineWidth);
  const currentPosition = (currentTime / safeDuration) * timelineWidth;
  
  // Referencias para el arrastre de la zona seleccionada
  const startPan = React.useRef(new Animated.Value(startPositionRef.current)).current;
  const selectionStartX = useRef(0);
  
  // Referencias para el arrastre del indicador de tiempo
  const currentTimeStartX = useRef(0);
  const currentTimeStartValue = useRef(currentTime);

  // Calcular marcas cada 30 segundos
  const marks = [];
  const markInterval = 30; // segundos
  for (let i = 0; i <= safeDuration; i += markInterval) {
    marks.push(i);
  }

  // PanResponder para arrastrar la zona seleccionada
  // Solo se activa si no se está tocando un handle (los handles tienen prioridad)
  const selectionPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Verificar que el toque no esté cerca de los handles
        // Usar locationX que es relativo al componente
        const touchX = evt.nativeEvent.locationX;
        const handleWidth = 30; // Área de toque del handle (más grande para mejor UX)
        const margin = 15; // Margen desde los bordes para evitar conflictos
        
        // No activar si el toque está cerca de los bordes (donde están los handles)
        const isNearStart = touchX >= startPositionRef.current && touchX < (startPositionRef.current + handleWidth + margin);
        const isNearEnd = touchX <= endPositionRef.current && touchX > (endPositionRef.current - handleWidth - margin);
        
        // Solo activar si el toque está en el centro de la zona (no cerca de los handles)
        const isInZone = touchX >= startPositionRef.current && touchX <= endPositionRef.current;
        // return isInZone && !isNearStart && !isNearEnd;
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Solo activar si hay movimiento significativo
        // return Math.abs(gestureState.dx) > 5;
        return true;
      },
      onPanResponderGrant: (evt) => {
        selectionStartX.current = evt.nativeEvent.pageX;
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaX = gestureState.moveX;
        const newSeconds = (deltaX / timelineWidth) * safeDuration;
        const deltaSeconds = newSeconds - ((startPositionRef.current / timelineWidth) * safeDuration);

        onSelectionMove(deltaSeconds);
      },
      onPanResponderRelease: () => {
        selectionStartX.current = 0;
      },
    }),
  ).current;

  // PanResponder para arrastrar el indicador de tiempo actual
  const currentTimePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        currentTimeStartX.current = evt.nativeEvent.pageX;
        currentTimeStartValue.current = currentTime;
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaX = gestureState.moveX - currentTimeStartX.current;
        const deltaSeconds = (deltaX / timelineWidth) * safeDuration;
        const newTime = currentTimeStartValue.current + deltaSeconds;
        
        // Validar que el nuevo tiempo esté dentro de los límites
        const clampedTime = Math.max(0, Math.min(newTime, safeDuration));
        onCurrentTimeChange(clampedTime);
      },
      onPanResponderRelease: () => {
        currentTimeStartX.current = 0;
      },
    }),
  ).current;
  
  // Actualizar referencias cuando cambian los valores
  React.useEffect(() => {
    startPositionRef.current = (start / safeDuration) * timelineWidth;
  }, [start]);

  React.useEffect(() => {
    endPositionRef.current = (end / safeDuration) * timelineWidth;
  }, [end]);

  // const handleOnStartChange
  
  React.useEffect(() => {
    currentTimeStartValue.current = currentTime;
  }, [currentTime]);

  return (
    <View style={styles.container}>
      <View style={[styles.timeline, { width: timelineWidth }]}>
        {/* Marcas de tiempo */}
        {marks.map((mark) => {
          const position = (mark / safeDuration) * timelineWidth;
          return (
            <View
              key={mark}
              style={[styles.mark, { left: position }]}
            />
          );
        })}

        {/* Zona seleccionada - Arrastrable */}
        <Animated.View
          style={[
            styles.selectedZone,
            {
              left: startPositionRef.current,
              width: endPositionRef.current - startPositionRef.current,
            },
          ]}
          {...selectionPanResponder.panHandlers}
        />

        {/* Indicador de tiempo actual - Arrastrable */}
        <Animated.View
          style={[styles.currentTimeIndicator, { left: currentPosition }]}
          {...currentTimePanResponder.panHandlers}
        />

        {/* Handles de selección */}
        <SelectionHandles
          start={start}
          end={end}
          duration={safeDuration}
          timelineWidth={timelineWidth}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  timeline: {
    height: 60,
    backgroundColor: '#333',
    borderRadius: 8,
    position: 'relative',
    alignSelf: 'center',
  },
  mark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#666',
  },
  selectedZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 8,
    zIndex: 5,
  },
  currentTimeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#fff',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 5,
  },
});
