import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';
import {API_URL} from '@/utils/constants';
import {normalizeApiResponse} from '@/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HighlightUser {
  id: string;
  username: string;
  profilePicture: string | null;
}

export interface HighlightGame {
  id: string;
  status: string;
}

export interface HighlightComment {
  id: string;
  highlightId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: HighlightUser;
}

export interface Highlight {
  id: string;
  userId: string;
  gameId: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  start: number;
  end: number;
  duration: number;
  title: string | null;
  isEnabled: boolean;
  likesCount?: number;
  isLikedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: HighlightUser;
  game?: HighlightGame;
  comments?: HighlightComment[];
}

export interface ToggleLikeResponse {
  liked: boolean;
  likesCount: number;
}

export interface CreateHighlightRequest {
  gameId: string;
  recordingUrl: string;
  start: number;
  end: number;
  title?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return {headers: {Authorization: `Bearer ${token}`}};
}

function handleError(error: any): never {
  if (error) {
    crashlytics().recordError(error);
  }
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Error en highlights. Por favor, intenta nuevamente.';
  const err = new Error(message);
  (err as any).status = error?.response?.status || 500;
  throw err;
}

// ─── API calls ───────────────────────────────────────────────────────────────

/** POST /highlights — create a highlight from a game clip */
export const createHighlightApi = async (
  token: string,
  dto: CreateHighlightRequest,
): Promise<Highlight> => {
  try {
    const res = await axios.post<Highlight>(
      `${API_URL}/highlights`,
      {
        ...dto,
        start: Math.floor(dto.start),
        end: Math.floor(dto.end),
      },
      authHeaders(token),
    );
    return normalizeApiResponse<Highlight>(res.data);
  } catch (error: any) {
    handleError(error);
  }
};

/** GET /highlights — list all enabled highlights (optional filters) */
export const getHighlightsApi = async (
  token: string,
  params?: {userId?: string; gameId?: string},
): Promise<Highlight[]> => {
  try {
    const res = await axios.get<Highlight[]>(`${API_URL}/highlights`, {
      ...authHeaders(token),
      params,
    });
    const data = normalizeApiResponse<Highlight[]>(res.data);
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    handleError(error);
  }
};

/** GET /highlights/my — highlights owned by the authenticated user */
export const getMyHighlightsApi = async (
  token: string,
): Promise<Highlight[]> => {
  try {
    const res = await axios.get<Highlight[]>(
      `${API_URL}/highlights/my`,
      authHeaders(token),
    );
    const data = normalizeApiResponse<Highlight[]>(res.data);
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    handleError(error);
  }
};

/** GET /highlights/:id — single highlight with comments */
export const getHighlightByIdApi = async (
  token: string,
  id: string,
): Promise<Highlight> => {
  try {
    const res = await axios.get<Highlight>(
      `${API_URL}/highlights/${id}`,
      authHeaders(token),
    );
    return normalizeApiResponse<Highlight>(res.data);
  } catch (error: any) {
    handleError(error);
  }
};

/** PATCH /highlights/:id/toggle — enable or disable a highlight */
export const toggleHighlightApi = async (
  token: string,
  id: string,
): Promise<Highlight> => {
  try {
    const res = await axios.patch<Highlight>(
      `${API_URL}/highlights/${id}/toggle`,
      {},
      authHeaders(token),
    );
    return normalizeApiResponse<Highlight>(res.data);
  } catch (error: any) {
    handleError(error);
  }
};

/** DELETE /highlights/:id */
export const deleteHighlightApi = async (
  token: string,
  id: string,
): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/highlights/${id}`, authHeaders(token));
  } catch (error: any) {
    handleError(error);
  }
};

/** POST /highlights/:id/comments */
export const addHighlightCommentApi = async (
  token: string,
  highlightId: string,
  content: string,
): Promise<HighlightComment> => {
  try {
    const res = await axios.post<HighlightComment>(
      `${API_URL}/highlights/${highlightId}/comments`,
      {content},
      authHeaders(token),
    );
    return normalizeApiResponse<HighlightComment>(res.data);
  } catch (error: any) {
    handleError(error);
  }
};

/** POST /highlights/:id/like — toggle like (adds if not liked, removes if already liked) */
export const likeHighlightApi = async (
  token: string,
  highlightId: string,
): Promise<ToggleLikeResponse> => {
  try {
    const res = await axios.post<ToggleLikeResponse>(
      `${API_URL}/highlights/${highlightId}/like`,
      {},
      authHeaders(token),
    );
    return normalizeApiResponse<ToggleLikeResponse>(res.data);
  } catch (error: any) {
    handleError(error);
  }
};

/** GET /highlights/:id/comments */
export const getHighlightCommentsApi = async (
  token: string,
  highlightId: string,
): Promise<HighlightComment[]> => {
  try {
    const res = await axios.get<HighlightComment[]>(
      `${API_URL}/highlights/${highlightId}/comments`,
      authHeaders(token),
    );
    const data = normalizeApiResponse<HighlightComment[]>(res.data);
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    handleError(error);
  }
};
