import {createAxiosInstance} from '@/api';
import {FollowBaseResponse} from '@/config/types';

export async function getIsFollowingUsers(usersIds: string[], token: string) {
  try {
    const res = await createAxiosInstance(token).get<FollowBaseResponse[]>(
      `/follow/is-following?ids=${usersIds.join('&ids=')}`,
    );

    return res.data;
  } catch (error) {
    throw error;
  }
}
