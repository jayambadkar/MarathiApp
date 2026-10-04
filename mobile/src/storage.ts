import {createMMKV} from 'react-native-mmkv';

const mmkv = createMMKV({id: 'marathi-app'});

// AsyncStorage-compatible interface backed by MMKV (synchronous native
// store, no KSP/Room/Kotlin toolchain coupling). All methods return
// Promises so call sites are unchanged.
const storage = {
  async getItem(key: string): Promise<string | null> {
    return mmkv.getString(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    mmkv.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    mmkv.remove(key);
  },
  async removeMany(keys: string[]): Promise<void> {
    for (const k of keys) {
      mmkv.remove(k);
    }
  },
  async getAllKeys(): Promise<string[]> {
    return mmkv.getAllKeys();
  },
  async clear(): Promise<void> {
    mmkv.clearAll();
  },
};

export default storage;
