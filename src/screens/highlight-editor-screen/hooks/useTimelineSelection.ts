import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseTimelineSelectionOptions {
  maxDuration: number; // Duración máxima del video en segundos
  minClipDuration?: number; // Duración mínima del clip (default: 3)
  maxClipDuration?: number; // Duración máxima del clip (default: 60)
}

export interface UseTimelineSelectionReturn {
  start: number;
  end: number;
  duration: number;
  isValid: boolean;
  setStart: (value: number) => void;
  setEnd: (value: number) => void;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  onSelectionMove: (deltaSeconds: number) => void; // Mover toda la selección manteniendo la duración
}

export const useTimelineSelection = (
  options: UseTimelineSelectionOptions,
): UseTimelineSelectionReturn => {
  const {
    maxDuration,
    minClipDuration = 3,
    maxClipDuration = 60,
  } = options;

  const [start, setStartState] = useState(0);
  const [end, setEndState] = useState(Math.floor(Math.min(60, maxDuration)));

  const startRef = useRef(start);
  const endRef = useRef(end);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => {
    endRef.current = end;
  }, [end]);

  const setStart = useCallback(
    (value: number) => {
      const clampedValue = Math.max(0, Math.min(value, maxDuration - minClipDuration));
      // Redondear a entero para evitar problemas con validación del backend
      const roundedValue = Math.floor(clampedValue);
      setStartState(roundedValue);
      // Asegurar que end no sea menor que start + minClipDuration
      if (startRef.current < roundedValue + minClipDuration) {
        setEndState(Math.floor(Math.min(roundedValue + minClipDuration, maxDuration)));
      }
    },
    [maxDuration, minClipDuration, end],
  );

  const setEnd = useCallback(
    (value: number) => {
      const clampedValue = Math.max(
        startRef.current + minClipDuration,
        Math.min(value, maxDuration),
      );
      // Redondear a entero para evitar problemas con validación del backend
      setEndState(Math.floor(clampedValue));
    },
    [maxDuration, minClipDuration, start],
  );

  const onStartChange = useCallback(
    (value: number) => {
      const newStart = Math.max(0, Math.min(value, endRef.current - minClipDuration));
      // Redondear a entero para evitar problemas con validación del backend
      setStartState(Math.floor(newStart));
    },
    [end, minClipDuration],
  );

  const onEndChange = useCallback(
    (value: number) => {
      const newEnd = Math.max(
        startRef.current + minClipDuration,
        Math.min(value, maxDuration),
      );
      // Redondear a entero para evitar problemas con validación del backend
      setEndState(Math.floor(newEnd));
    },
    [maxDuration, minClipDuration, start],
  );

  const onSelectionMove = useCallback(
    (deltaSeconds: number) => {
      const currentDuration = endRef.current - startRef.current;
      const offset = currentDuration / 2;

      const newStart = Math.max(0, Math.min(startRef.current + deltaSeconds - offset, maxDuration - currentDuration));
      const newEnd = newStart + currentDuration;
      
      // Asegurar que no exceda la duración máxima
      if (newEnd > maxDuration) {
        const adjustedStart = Math.max(0, maxDuration - currentDuration);
        setStartState(Math.floor(adjustedStart));
        setEndState(Math.floor(maxDuration));
      } else {
        setStartState(Math.floor(newStart));
        setEndState(Math.floor(newEnd));
      }
    },
    [start, end, maxDuration],
  );

  const duration = end - start;
  const isValid = duration >= minClipDuration && duration <= maxClipDuration;

  return {
    start,
    end,
    duration,
    isValid,
    setStart,
    setEnd,
    onStartChange,
    onEndChange,
    onSelectionMove,
  };
};
