import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = '@torna/auth-token';

export interface UserMediaItem {
  id: string;
  url: string;
  kind: 'photo' | 'video';
  title?: string;
  visibility: 'public' | 'private';
  createdAt: string;
}

export function useOwnMedia() {
  const [media, setMedia] = useState<UserMediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await fetch(`${API_URL}/media/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setMedia(Array.isArray(json) ? json : json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return {
    media,
    loading,
    refresh: load,
    photos: media.filter((m) => m.kind === 'photo'),
    videos: media.filter((m) => m.kind === 'video'),
  };
}
