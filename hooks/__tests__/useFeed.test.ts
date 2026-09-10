/**
 * useFeed: mapea GET /highlights/feed a FeedPost (con thumbnailUrl + isLikedByMe)
 * y expone `toggleLike` — like/unlike OPTIMISTA con revert si falla el backend.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFeed } from '../useFeed';
import { fetchFeed, toggleHighlightLike, type FeedHighlight } from '../../api/highlights';

jest.mock('../../api/highlights');

const mockFetchFeed = fetchFeed as jest.MockedFunction<typeof fetchFeed>;
const mockToggle = toggleHighlightLike as jest.MockedFunction<typeof toggleHighlightLike>;

const hl: FeedHighlight = {
  id: 'hl-1',
  clipUrl: 'https://b2/clip.mp4',
  thumbnailUrl: 'https://b2/thumb.jpg',
  duration: 12,
  title: 'Remate',
  createdAt: new Date().toISOString(),
  likesCount: 3,
  commentsCount: 1,
  isLikedByMe: false,
  author: { id: 'u1', username: 'maxi', name: 'Maxi', profilePicture: null, isClub: false },
};

describe('useFeed', () => {
  afterEach(() => jest.clearAllMocks());

  it('mapea thumbnailUrl e isLikedByMe del highlight', async () => {
    mockFetchFeed.mockResolvedValue([hl]);
    const { result } = renderHook(() => useFeed('me'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.feed[0]).toMatchObject({
      id: 'hl-1',
      thumbnailUrl: 'https://b2/thumb.jpg',
      isLikedByMe: false,
      likes: 3,
      videoUrl: 'https://b2/clip.mp4',
    });
  });

  it('toggleLike: like optimista y persiste con POST /highlights/:id/like', async () => {
    mockFetchFeed.mockResolvedValue([hl]);
    mockToggle.mockResolvedValue({ liked: true, likesCount: 4 });
    const { result } = renderHook(() => useFeed('me'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.toggleLike('hl-1'); });

    expect(mockToggle).toHaveBeenCalledWith('hl-1');
    expect(result.current.feed[0].isLikedByMe).toBe(true);
    expect(result.current.feed[0].likes).toBe(4);
  });

  it('toggleLike: REVIERTE si el backend falla', async () => {
    mockFetchFeed.mockResolvedValue([hl]);
    mockToggle.mockRejectedValue(new Error('HTTP 500'));
    const { result } = renderHook(() => useFeed('me'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.toggleLike('hl-1'); });

    expect(result.current.feed[0].isLikedByMe).toBe(false);
    expect(result.current.feed[0].likes).toBe(3);
  });

  it('un segundo toggleLike sobre un highlight ya likeado lo quita (unlike)', async () => {
    mockFetchFeed.mockResolvedValue([{ ...hl, isLikedByMe: true, likesCount: 4 }]);
    mockToggle.mockResolvedValue({ liked: false, likesCount: 3 });
    const { result } = renderHook(() => useFeed('me'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.toggleLike('hl-1'); });

    expect(result.current.feed[0].isLikedByMe).toBe(false);
    expect(result.current.feed[0].likes).toBe(3);
  });
});
