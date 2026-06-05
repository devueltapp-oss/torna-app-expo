import React from 'react';
import { View, Image, ViewStyle, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../../theme';

let createThumbnail: ((opts: { url: string; timeStamp: number }) => Promise<{ path: string }>) | null = null;
try {
  const mod = require('react-native-create-thumbnail');
  createThumbnail = mod.createThumbnail;
} catch {
  // Not available in Expo Go or web — skeletons will be shown.
}

export interface VideoFilmstripProps {
  videoUrl: string;
  durationSeconds: number;
  frameCount?: number;
  containerWidth?: number;
  height?: number;
  style?: ViewStyle;
}

// Generates timestamps evenly distributed across the duration.
function buildTimestamps(count: number, durationSeconds: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    Math.round((i / Math.max(count - 1, 1)) * durationSeconds * 1000),
  );
}

// Loads thumbnails in order of visual priority:
// 1. First and last frame (edges visible immediately)
// 2. Remaining frames in batches of 3, left→right
async function generateBatched(
  count: number,
  timestamps: number[],
  videoUrl: string,
  onFrame: (index: number, path: string | null) => void,
  isCancelled: () => boolean,
) {
  // Probe the first frame to detect whether remote URLs work on this device/OS.
  // On older Android (<7) MediaMetadataRetriever doesn't support HTTP — if it
  // throws, we bail silently and keep the skeletons.
  try {
    const probe = await createThumbnail!({ url: videoUrl, timeStamp: 0 });
    if (isCancelled()) return;
    onFrame(0, probe.path);
  } catch {
    // Remote URL not supported — leave all frames as skeletons.
    return;
  }

  // Last frame
  if (count > 1) {
    try {
      const last = await createThumbnail!({ url: videoUrl, timeStamp: timestamps[count - 1] });
      if (isCancelled()) return;
      onFrame(count - 1, last.path);
    } catch {
      onFrame(count - 1, null);
    }
  }

  // Remaining frames in batches of 3
  const BATCH = 3;
  const middle = Array.from({ length: count }, (_, i) => i).filter(
    (i) => i !== 0 && i !== count - 1,
  );

  for (let b = 0; b < middle.length; b += BATCH) {
    if (isCancelled()) return;
    const slice = middle.slice(b, b + BATCH);
    await Promise.allSettled(
      slice.map(async (i) => {
        try {
          const r = await createThumbnail!({ url: videoUrl, timeStamp: timestamps[i] });
          if (!isCancelled()) onFrame(i, r.path);
        } catch {
          if (!isCancelled()) onFrame(i, null);
        }
      }),
    );
  }
}

export function VideoFilmstrip({
  videoUrl,
  durationSeconds,
  frameCount = 10,
  containerWidth: externalWidth,
  height: fixedHeight,
  style,
}: VideoFilmstripProps) {
  const { colors } = useTheme();
  const [framePaths, setFramePaths] = React.useState<(string | null)[]>(
    () => Array(frameCount).fill(null),
  );
  const [measuredWidth, setMeasuredWidth] = React.useState(0);

  const width = externalWidth ?? measuredWidth;
  const frameW = width > 0 ? width / frameCount : 0;
  const frameH = fixedHeight ?? (frameW > 0 ? Math.round(frameW * (9 / 16)) : 40);

  const onLayout = (e: LayoutChangeEvent) => {
    if (externalWidth === undefined) setMeasuredWidth(e.nativeEvent.layout.width);
  };

  React.useEffect(() => {
    if (!createThumbnail || durationSeconds <= 0) return;

    const count = Math.max(1, frameCount);
    const timestamps = buildTimestamps(count, durationSeconds);
    let cancelled = false;

    setFramePaths(Array(count).fill(null));

    generateBatched(
      count,
      timestamps,
      videoUrl,
      (index, path) => {
        setFramePaths((prev) => {
          const next = [...prev];
          next[index] = path;
          return next;
        });
      },
      () => cancelled,
    );

    return () => { cancelled = true; };
  }, [videoUrl, durationSeconds, frameCount]);

  return (
    <View
      style={[{ flexDirection: 'row', overflow: 'hidden', borderRadius: 8 }, style]}
      onLayout={onLayout}
    >
      {Array.from({ length: frameCount }, (_, i) => {
        const path = framePaths[i];
        return (
          <View
            key={i}
            style={{
              width: frameW || undefined,
              flex: frameW ? undefined : 1,
              height: frameH,
              backgroundColor: i % 2 === 0 ? colors.line : colors.bg2,
            }}
          >
            {path ? (
              <Image
                source={{ uri: path }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
