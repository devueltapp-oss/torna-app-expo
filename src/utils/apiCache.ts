import {useState, useRef} from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clear expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const apiCache = new ApiCache();

// Track ongoing requests to prevent duplicates
const ongoingRequests = new Map<string, Promise<any>>();

// Hook para manejar cache de datos de perfil
export function useProfileCache() {
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 10 * 1000; // 10 seconds minimum between fetches (reduced from 30)

  const fetchProfileData = async <T>(
    userId: string,
    fetchFunction: (token: string) => Promise<T>,
    getAccessToken: () => Promise<string>,
    forceRefresh: boolean = false
  ): Promise<T | null> => {
    const cacheKey = `profile_${userId}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = apiCache.get<T>(cacheKey);
      if (cachedData) {
        console.log('📦 Using cached profile data for user:', userId);
        return cachedData;
      }
    }

    // Check if there's already an ongoing request for this user
    if (ongoingRequests.has(cacheKey)) {
      console.log('⏳ Request already in progress for user:', userId);
      return ongoingRequests.get(cacheKey);
    }

    // Prevent too frequent API calls
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < MIN_FETCH_INTERVAL) {
      console.log('⏱️ Too soon to fetch profile data, using cache if available');
      const cachedData = apiCache.get<T>(cacheKey);
      return cachedData;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        setIsLoading(true);
        lastFetchTime.current = now;
        
        console.log('🌐 Fetching fresh profile data for user:', userId);
        const accessToken = await getAccessToken();
        const data = await fetchFunction(accessToken);
        
        // Cache the result
        apiCache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes TTL
        
        return data;
      } catch (error) {
        console.error('❌ Error fetching profile data:', error);
        // Return cached data if available, even if expired
        const cachedData = apiCache.get<T>(cacheKey);
        if (cachedData) {
          console.log('🔄 Using expired cache due to error');
          return cachedData;
        }
        throw error;
      } finally {
        setIsLoading(false);
        // Remove from ongoing requests
        ongoingRequests.delete(cacheKey);
      }
    })();

    // Store the ongoing request
    ongoingRequests.set(cacheKey, requestPromise);
    
    return requestPromise;
  };

  const invalidateProfileCache = (userId: string) => {
    const cacheKey = `profile_${userId}`;
    apiCache.delete(cacheKey);
    console.log('🗑️ Invalidated profile cache for user:', userId);
  };

  const clearAllCache = () => {
    apiCache.clear();
    console.log('🧹 Cleared all API cache');
  };

  return {
    fetchProfileData,
    invalidateProfileCache,
    clearAllCache,
    isLoading,
  };
}

// Cleanup expired cache items every 10 minutes
setInterval(() => {
  apiCache.cleanup();
}, 10 * 60 * 1000);
