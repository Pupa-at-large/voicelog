// 统一存储层（对齐 sync-and-identity-design.md 的 Store 抽象）。
// 现在用 AsyncStorage（本地）；将来这一层可换成 SQLite + 同步引擎，UI 不动。
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED, type EventsMap } from './model';

const KEY = 'voicelog:events';
const THEME_KEY = 'voicelog:theme';

export const Store = {
  async loadEvents(): Promise<EventsMap> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as EventsMap;
    } catch {}
    return JSON.parse(JSON.stringify(SEED)) as EventsMap;
  },
  async saveEvents(events: EventsMap): Promise<void> {
    try { await AsyncStorage.setItem(KEY, JSON.stringify(events)); } catch {}
  },
  async loadTheme(): Promise<string | null> {
    try { return await AsyncStorage.getItem(THEME_KEY); } catch { return null; }
  },
  async saveTheme(key: string): Promise<void> {
    try { await AsyncStorage.setItem(THEME_KEY, key); } catch {}
  },
};
