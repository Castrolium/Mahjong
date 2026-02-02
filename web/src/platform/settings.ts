export type ZoomFactor = 100 | 125 | 150 | 200;
export type Difficulty = 'beginner' | 'expert';

export interface OptionToggles {
  watchBuilds: boolean;
  peek: boolean;
}

const STORAGE_KEYS = {
  zoomFactor: 'taipei.zoomFactor',
  messagesVisible: 'taipei.messagesVisible',
  difficulty: 'taipei.difficulty',
  watchBuilds: 'taipei.options.watchBuilds',
  peek: 'taipei.options.peek',
};

const DEFAULTS = {
  zoomFactor: 100 as ZoomFactor,
  messagesVisible: true,
  difficulty: 'expert' as Difficulty,
  optionToggles: {
    watchBuilds: false,
    peek: false,
  },
};

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Local storage unavailable, using defaults.', error);
    return null;
  }
};

const normalizeBoolean = (value: string | null): boolean | null => {
  if (value === null) {
    return null;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return null;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const storage = getStorage();
  const storedValue = normalizeBoolean(storage?.getItem(key) ?? null);

  if (storedValue === null) {
    if (storage) {
      storage.setItem(key, fallback ? 'True' : 'False');
    }
    return fallback;
  }

  return storedValue;
};

const readString = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T => {
  const storage = getStorage();
  const storedValue = storage?.getItem(key) ?? null;

  if (storedValue && allowed.includes(storedValue as T)) {
    return storedValue as T;
  }

  if (storage) {
    storage.setItem(key, fallback);
  }

  return fallback;
};

const readZoomFactor = (): ZoomFactor => {
  const storage = getStorage();
  const storedValue = storage?.getItem(STORAGE_KEYS.zoomFactor) ?? null;
  const parsed = storedValue ? Number.parseInt(storedValue, 10) : NaN;
  const allowed: ZoomFactor[] = [100, 125, 150, 200];

  if (!Number.isNaN(parsed) && allowed.includes(parsed as ZoomFactor)) {
    return parsed as ZoomFactor;
  }

  if (storage) {
    storage.setItem(STORAGE_KEYS.zoomFactor, String(DEFAULTS.zoomFactor));
  }

  return DEFAULTS.zoomFactor;
};

export const getZoomFactor = (): ZoomFactor => readZoomFactor();

export const setZoomFactor = (value: ZoomFactor): void => {
  const storage = getStorage();
  storage?.setItem(STORAGE_KEYS.zoomFactor, String(value));
};

export const getMessagesVisible = (): boolean =>
  readBoolean(STORAGE_KEYS.messagesVisible, DEFAULTS.messagesVisible);

export const setMessagesVisible = (visible: boolean): void => {
  const storage = getStorage();
  storage?.setItem(STORAGE_KEYS.messagesVisible, visible ? 'True' : 'False');
};

export const getDifficulty = (): Difficulty =>
  readString(STORAGE_KEYS.difficulty, ['beginner', 'expert'], DEFAULTS.difficulty);

export const setDifficulty = (difficulty: Difficulty): void => {
  const storage = getStorage();
  storage?.setItem(STORAGE_KEYS.difficulty, difficulty);
};

export const getOptionToggles = (): OptionToggles => ({
  watchBuilds: readBoolean(STORAGE_KEYS.watchBuilds, DEFAULTS.optionToggles.watchBuilds),
  peek: readBoolean(STORAGE_KEYS.peek, DEFAULTS.optionToggles.peek),
});

export const setOptionToggles = (options: OptionToggles): void => {
  const storage = getStorage();
  storage?.setItem(STORAGE_KEYS.watchBuilds, options.watchBuilds ? 'True' : 'False');
  storage?.setItem(STORAGE_KEYS.peek, options.peek ? 'True' : 'False');
};
