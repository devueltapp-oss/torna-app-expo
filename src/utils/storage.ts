import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storeData(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // saving error
  }
}

export async function getData(key: string) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value;
  } catch (e) {
    // error reading value
    return null;
  }
}

export enum STORAGE_KEYS {
  USER_ID = 'user_id',
}
