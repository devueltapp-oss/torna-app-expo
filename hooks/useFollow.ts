import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = '@torna/auth-token';

export function useFollow(
  targetId: string,
  initial: { isFollowing: boolean; followers: number },
) {
  const [isFollowing, setIsFollowing] = useState(initial.isFollowing);
  const [followers, setFollowers] = useState(initial.followers);

  const toggle = useCallback(async () => {
    const wasFollowing = isFollowing;
    // optimistic update
    setIsFollowing(!wasFollowing);
    setFollowers((f) => (wasFollowing ? f - 1 : f + 1));

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const endpoint = wasFollowing ? '/follow/unfollow' : '/follow';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetId }),
      });
      if (!res.ok) throw new Error('Follow request failed');
    } catch {
      // revert on error
      setIsFollowing(wasFollowing);
      setFollowers((f) => (wasFollowing ? f + 1 : f - 1));
    }
  }, [isFollowing, targetId]);

  return { isFollowing, followers, toggle };
}
